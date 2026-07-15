import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role, TaskStatus } from "@/lib/generated/prisma/client";
import { resolveOwnClientProject } from "@/lib/client-access";
import { computeProjectHealth } from "@/lib/projects/health";
import { computeBudgetSummary, getUpcomingMilestones } from "@/lib/portal/overview";

// Takes no project id — the portal doesn't know it upfront, and Phase 1
// assumes exactly one project per Client. Returns project.id so the portal
// UI can use it for the (shared, already company/client-scoped) files,
// invoices, and status-comments endpoints on subsequent calls.
//
// Purpose-built sanitized view — an allowlist of fields rather than a
// filtered version of the internal GET /api/projects/:id, so a future field
// addition there can't silently leak to homeowners. Never includes
// Project.budget (raw internal figure); only the computed spent-vs-approved
// summary (PRD 9.6).
export const GET = withAuth(
  async (_req, auth) => {
    const project = await resolveOwnClientProject(auth.userId, auth.companyId);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const overdueTaskCount = await prisma.task.count({
      where: { projectId: project.id, status: { not: TaskStatus.DONE }, dueDate: { lt: new Date() } },
    });
    const health = computeProjectHealth({
      status: project.status,
      targetDate: project.targetDate,
      overdueTaskCount,
    });

    const [budgetSummary, upcomingMilestones] = await Promise.all([
      computeBudgetSummary(project.id),
      getUpcomingMilestones(project.id),
    ]);

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        address: project.address,
        status: project.status,
        health,
        startDate: project.startDate,
        targetDate: project.targetDate,
      },
      budgetSummary,
      upcomingMilestones,
    });
  },
  { roles: [Role.CLIENT] }
);
