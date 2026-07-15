import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/client";

type RouteCtx = { params: Promise<{ id: string; projectId: string }> };

export const DELETE = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id, projectId } = await params;

    const assignment = await prisma.projectAssignment.findFirst({
      where: { userId: id, projectId, project: { companyId: auth.companyId } },
    });
    if (!assignment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.projectAssignment.delete({ where: { id: assignment.id } });
    return NextResponse.json({ success: true });
  },
  { roles: [Role.OWNER, Role.ADMIN] }
);
