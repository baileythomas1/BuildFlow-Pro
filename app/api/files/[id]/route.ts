import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { FileVisibility, Role } from "@/lib/generated/prisma/client";
import { getSignedDownloadUrl } from "@/lib/storage";

type RouteCtx = { params: Promise<{ id: string }> };

// PRD 12: GET /api/files/:id returns a signed URL — never a public path.
// The URL is generated fresh on every call with a short TTL rather than
// stored, so access always re-checks company/visibility scope first.
export const GET = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id } = await params;

    const file = await prisma.file.findFirst({
      where: { id, project: { companyId: auth.companyId } },
      include: {
        project: { select: { clientId: true } },
        uploader: { select: { id: true, name: true } },
      },
    });
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (auth.role === Role.CLIENT) {
      if (file.visibility !== FileVisibility.CLIENT) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const client = await prisma.client.findFirst({
        where: { userId: auth.userId, companyId: auth.companyId },
      });
      if (!client || client.id !== file.project.clientId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const url = await getSignedDownloadUrl(file.storagePath);

    return NextResponse.json({
      file: {
        id: file.id,
        type: file.type,
        visibility: file.visibility,
        createdAt: file.createdAt,
        uploader: file.uploader,
      },
      url,
    });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM, Role.EMPLOYEE, Role.CLIENT] }
);
