import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/client";
import { resolveClientProject } from "@/lib/client-access";

type RouteCtx = { params: Promise<{ id: string }> };

const COMMENT_SELECT = {
  id: true,
  body: true,
  createdAt: true,
  author: { select: { id: true, name: true } },
} as const;

// One-way: GET is shared (staff + Client both read), but only POST exists
// for staff — there is no reply endpoint, by design (PRD 9.6 / 10).
export const GET = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id: projectId } = await params;

    if (auth.role === Role.CLIENT) {
      const project = await resolveClientProject(auth.userId, auth.companyId, projectId);
      if (!project) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    } else {
      const project = await prisma.project.findFirst({
        where: { id: projectId, companyId: auth.companyId },
      });
      if (!project) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const comments = await prisma.statusComment.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: COMMENT_SELECT,
    });
    return NextResponse.json({ comments });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM, Role.CLIENT] }
);

export const POST = withAuth<RouteCtx>(
  async (req: NextRequest, auth, { params }) => {
    const { id: projectId } = await params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId: auth.companyId },
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { body: commentBody } = body as Record<string, unknown>;
    if (typeof commentBody !== "string" || !commentBody.trim()) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }

    const comment = await prisma.statusComment.create({
      data: { projectId, authorId: auth.userId, body: commentBody.trim() },
      select: COMMENT_SELECT,
    });

    return NextResponse.json({ comment }, { status: 201 });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM] }
);
