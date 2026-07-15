import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role, TaskStatus } from "@/lib/generated/prisma/client";
import { computeProjectHealth } from "@/lib/projects/health";
import { isValidProjectStatus, parseBudget, parseOptionalDate } from "@/lib/projects/validate";
import { findOrCreateClient } from "@/lib/projects/find-or-create-client";

// GET is available to every internal role (Employees are "read-mostly" per
// PRD 5.3); mutations are restricted to Owner/Admin/PM in the POST handler
// below. The homeowner Client role has no access here — the sanitized,
// read-only project view for clients is the portal (PRD 9.6), not yet built.
export const GET = withAuth(
  async (_req, auth) => {
    const projects = await prisma.project.findMany({
      where: { companyId: auth.companyId, archivedAt: null },
      include: { client: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    const overdueCounts = await prisma.task.groupBy({
      by: ["projectId"],
      where: {
        projectId: { in: projects.map((p) => p.id) },
        status: { not: TaskStatus.DONE },
        dueDate: { lt: new Date() },
      },
      _count: { _all: true },
    });
    const overdueByProject = new Map(overdueCounts.map((row) => [row.projectId, row._count._all]));

    const result = projects.map((project) => ({
      ...project,
      budget: project.budget.toFixed(2),
      health: computeProjectHealth({
        status: project.status,
        targetDate: project.targetDate,
        overdueTaskCount: overdueByProject.get(project.id) ?? 0,
      }),
    }));

    return NextResponse.json({ projects: result });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM, Role.EMPLOYEE] }
);

export const POST = withAuth(
  async (req: NextRequest, auth) => {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { name, address, budget, status, startDate, targetDate, clientId, client } =
      body as Record<string, unknown>;

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (typeof address !== "string" || !address.trim()) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
    }

    const parsedBudget = parseBudget(budget);
    if (parsedBudget === null) {
      return NextResponse.json({ error: "budget must be a non-negative number" }, { status: 400 });
    }

    if (status !== undefined && !isValidProjectStatus(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const startDateResult = parseOptionalDate(startDate);
    const targetDateResult = parseOptionalDate(targetDate);
    if (!startDateResult.ok || !targetDateResult.ok) {
      return NextResponse.json({ error: "Invalid start or target date" }, { status: 400 });
    }

    let resolvedClientId: string;
    if (typeof clientId === "string" && clientId) {
      const existing = await prisma.client.findFirst({
        where: { id: clientId, companyId: auth.companyId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Invalid client" }, { status: 400 });
      }
      resolvedClientId = existing.id;
    } else if (
      client &&
      typeof client === "object" &&
      typeof (client as Record<string, unknown>).name === "string" &&
      typeof (client as Record<string, unknown>).email === "string" &&
      (client as Record<string, unknown>).name &&
      (client as Record<string, unknown>).email
    ) {
      const c = client as { name: string; email: string };
      const created = await findOrCreateClient(auth.companyId, { name: c.name.trim(), email: c.email.trim() });
      resolvedClientId = created.id;
    } else {
      return NextResponse.json(
        { error: "clientId or client (name and email) is required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        companyId: auth.companyId,
        clientId: resolvedClientId,
        name: name.trim(),
        address: address.trim(),
        budget: parsedBudget,
        status: status ?? undefined,
        startDate: startDateResult.date,
        targetDate: targetDateResult.date,
      },
      include: { client: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(
      {
        project: {
          ...project,
          budget: project.budget.toFixed(2),
          health: computeProjectHealth({
            status: project.status,
            targetDate: project.targetDate,
            overdueTaskCount: 0,
          }),
        },
      },
      { status: 201 }
    );
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM] }
);
