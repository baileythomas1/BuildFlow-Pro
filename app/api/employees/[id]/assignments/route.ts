import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/client";

type RouteCtx = { params: Promise<{ id: string }> };

export const POST = withAuth<RouteCtx>(
  async (req: NextRequest, auth, { params }) => {
    const { id } = await params;

    const employee = await prisma.user.findFirst({ where: { id, companyId: auth.companyId } });
    if (!employee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { projectId } = body as Record<string, unknown>;
    if (typeof projectId !== "string") {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId: auth.companyId, archivedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 });
    }

    const assignment = await prisma.projectAssignment.upsert({
      where: { projectId_userId: { projectId, userId: id } },
      create: { projectId, userId: id },
      update: {},
    });

    return NextResponse.json({ assignment }, { status: 201 });
  },
  { roles: [Role.OWNER, Role.ADMIN] }
);
