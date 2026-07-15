import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { EstimateStatus, Role } from "@/lib/generated/prisma/client";
import { notifyEstimateDecision } from "@/lib/notifications/events";

type RouteCtx = { params: Promise<{ id: string }> };

export const POST = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id } = await params;

    const estimate = await prisma.estimate.findFirst({
      where: { id, project: { companyId: auth.companyId } },
      include: { project: { select: { id: true, name: true, clientId: true } } },
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
        { error: "Only a sent estimate can be rejected" },
        { status: 400 }
      );
    }

    const updated = await prisma.estimate.update({
      where: { id: estimate.id },
      data: { status: EstimateStatus.REJECTED },
    });

    await notifyEstimateDecision({
      estimateId: updated.id,
      estimateTitle: updated.title,
      status: "REJECTED",
      projectId: estimate.project.id,
      projectName: estimate.project.name,
      companyId: auth.companyId,
    });

    return NextResponse.json({ estimate: updated });
  },
  { roles: [Role.CLIENT] }
);
