import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { FileVisibility, Role } from "@/lib/generated/prisma/client";
import { isValidVisibility, MAX_FILE_SIZE_BYTES } from "@/lib/files/validate";
import { resolveClientProject } from "@/lib/files/client-access";
import { getSignedDownloadUrl, uploadFile } from "@/lib/storage";

type RouteCtx = { params: Promise<{ id: string }> };

const FILE_SELECT = {
  id: true,
  type: true,
  visibility: true,
  createdAt: true,
  uploader: { select: { id: true, name: true } },
} as const;

// PRD 9.4: homeowners see a read-only, filtered subset — no internal-only
// documents. A CLIENT-role caller only ever gets visibility=CLIENT files,
// and only for the one project their linked Client profile owns; this is
// enforced here regardless of whether any UI calls it yet.
export const GET = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id: projectId } = await params;

    if (auth.role === Role.CLIENT) {
      const project = await resolveClientProject(auth.userId, auth.companyId, projectId);
      if (!project) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const files = await prisma.file.findMany({
        where: { projectId, visibility: FileVisibility.CLIENT },
        orderBy: { createdAt: "desc" },
        select: FILE_SELECT,
      });
      return NextResponse.json({ files });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId: auth.companyId },
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const files = await prisma.file.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: FILE_SELECT,
    });
    return NextResponse.json({ files });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM, Role.EMPLOYEE, Role.CLIENT] }
);

// PRD 5.3: site employees upload jobsite photos from the field, so upload
// (unlike task/project creation) includes EMPLOYEE. Clients never upload.
export const POST = withAuth<RouteCtx>(
  async (req: NextRequest, auth, { params }) => {
    const { id: projectId } = await params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId: auth.companyId },
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const file = formData.get("file");
    const type = formData.get("type");
    const visibility = formData.get("visibility") ?? FileVisibility.INTERNAL;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (typeof type !== "string" || !type.trim()) {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }
    if (!isValidVisibility(visibility)) {
      return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File exceeds the 20MB limit" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${auth.companyId}/${projectId}/${randomUUID()}-${safeName}`;

    await uploadFile(storagePath, bytes, file.type || "application/octet-stream");

    const created = await prisma.file.create({
      data: {
        projectId,
        uploaderId: auth.userId,
        storagePath,
        visibility,
        type: type.trim(),
      },
      select: FILE_SELECT,
    });

    const url = await getSignedDownloadUrl(storagePath);

    return NextResponse.json({ file: created, url }, { status: 201 });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM, Role.EMPLOYEE] }
);
