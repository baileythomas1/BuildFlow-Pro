import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role, TaskStatus } from "@/lib/generated/prisma/client";
import { computeProjectHealth } from "@/lib/projects/health";
import { isValidProjectStatus, parseBudget, parseOptionalDate } from "@/lib/projects/validate";

type RouteCtx = { params: Promise<{ id: string }> };

async function loadOverdueCount(projectId: string) {
  return prisma.task.count({
    where: { projectId, status: { not: TaskStatus.DONE }, dueDate: { lt: new Date() } },
  });
}

export const GET = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id } = await params;

    // companyId always comes from the verified token, never the URL/body —
    // this is what makes a cross-tenant lookup return 404, not another
    // company's data.
    const project = await prisma.project.findFirst({
      where: { id, companyId: auth.companyId },
      include: { client: { select: { id: true, name: true, email: true } } },
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const overdueTaskCount = await loadOverdueCount(project.id);

    return NextResponse.json({
      project: {
        ...project,
        budget: project.budget.toFixed(2),
        health: computeProjectHealth({
          status: project.status,
          targetDate: project.targetDate,
          overdueTaskCount,
        }),
      },
    });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM, Role.EMPLOYEE] }
);

export const PATCH = withAuth<RouteCtx>(
  async (req: NextRequest, auth, { params }) => {
    const { id } = await params;

    const existing = await prisma.project.findFirst({ where: { id, companyId: auth.companyId } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.archivedAt) {
      return NextResponse.json({ error: "Project is archived" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { name, address, budget, status, startDate, targetDate, clientId } =
      body as Record<string, unknown>;

    const data: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
      }
      data.name = name.trim();
    }

    if (address !== undefined) {
      if (typeof address !== "string" || !address.trim()) {
        return NextResponse.json({ error: "address must be a non-empty string" }, { status: 400 });
      }
      data.address = address.trim();
    }

    if (budget !== undefined) {
      const parsedBudget = parseBudget(budget);
      if (parsedBudget === null) {
        return NextResponse.json({ error: "budget must be a non-negative number" }, { status: 400 });
      }
      data.budget = parsedBudget;
    }

    if (status !== undefined) {
      if (!isValidProjectStatus(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.status = status;
    }

    if (startDate !== undefined) {
      const result = parseOptionalDate(startDate);
      if (!result.ok) return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
      data.startDate = result.date;
    }

    if (targetDate !== undefined) {
      const result = parseOptionalDate(targetDate);
      if (!result.ok) return NextResponse.json({ error: "Invalid target date" }, { status: 400 });
      data.targetDate = result.date;
    }

    if (clientId !== undefined) {
      if (typeof clientId !== "string" || !clientId) {
        return NextResponse.json({ error: "Invalid client" }, { status: 400 });
      }
      const client = await prisma.client.findFirst({
        where: { id: clientId, companyId: auth.companyId },
      });
      if (!client) {
        return NextResponse.json({ error: "Invalid client" }, { status: 400 });
      }
      data.clientId = clientId;
    }

    const project = await prisma.project.update({
      where: { id: existing.id },
      data,
      include: { client: { select: { id: true, name: true, email: true } } },
    });

    const overdueTaskCount = await loadOverdueCount(project.id);

    return NextResponse.json({
      project: {
        ...project,
        budget: project.budget.toFixed(2),
        health: computeProjectHealth({
          status: project.status,
          targetDate: project.targetDate,
          overdueTaskCount,
        }),
      },
    });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM] }
);

// Soft-delete only, per CLAUDE.md / PRD 9.2 — financial records tied to a
// project (future Estimates/Invoices) must stay queryable for accounting.
export const DELETE = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id } = await params;

    const existing = await prisma.project.findFirst({ where: { id, companyId: auth.companyId } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.archivedAt) {
      return NextResponse.json({ error: "Project already archived" }, { status: 409 });
    }

    const project = await prisma.project.update({
      where: { id: existing.id },
      data: { archivedAt: new Date() },
    });

    return NextResponse.json({ project: { ...project, budget: project.budget.toFixed(2) } });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM] }
);
