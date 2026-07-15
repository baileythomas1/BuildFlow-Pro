import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { EstimateStatus, Role } from "@/lib/generated/prisma/client";

type RouteCtx = { params: Promise<{ id: string }> };

// PRD 9.5: "homeowner approves/rejects an estimate from the portal; approval
// converts it to a locked baseline budget." Client-only, own-project-only,
// and only from SENT — this is the sole path that ever sets APPROVED, and
// once set, every other estimate/line-item route refuses to touch it.
export const POST = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id } = await params;

    const estimate = await prisma.estimate.findFirst({
      where: { id, project: { companyId: auth.companyId } },
      include: { project: { select: { clientId: true } } },
    });
    if (!estimate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const client = await prisma.client.findFirst({
      where: { userId: auth.userId, companyId: auth.companyId },
    });
    if (!client || client.id !== estimate.project.clientId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (estimate.status !== EstimateStatus.SENT) {
      return NextResponse.json(
        { error: "Only a sent estimate can be approved" },
        { status: 400 }
      );
    }

    const updated = await prisma.estimate.update({
      where: { id: estimate.id },
      data: { status: EstimateStatus.APPROVED, approvedAt: new Date() },
    });

    return NextResponse.json({ estimate: updated });
  },
  { roles: [Role.CLIENT] }
);
