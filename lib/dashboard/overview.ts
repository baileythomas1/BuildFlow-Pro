import { prisma } from "@/lib/prisma";
import { InvoiceStatus, TaskStatus } from "@/lib/generated/prisma/client";
import { computeProjectHealth, type ProjectHealth } from "@/lib/projects/health";

// PRD 9.9: "active project count by health status, overdue task count,
// outstanding invoice total, upcoming milestones (next 14 days)." Company-
// wide, unlike the per-project health badge on the Projects page or the
// per-project "upcoming milestones" on the client portal — this rolls every
// active project up into one view for Owner/Admin.
export async function computeDashboard(companyId: string) {
  const now = new Date();

  const projects = await prisma.project.findMany({
    where: { companyId, archivedAt: null },
    select: { id: true, status: true, targetDate: true },
  });

  const overdueByProject = await prisma.task.groupBy({
    by: ["projectId"],
    where: {
      projectId: { in: projects.map((p) => p.id) },
      status: { not: TaskStatus.DONE },
      dueDate: { lt: now },
    },
    _count: { _all: true },
  });
  const overdueMap = new Map(overdueByProject.map((row) => [row.projectId, row._count._all]));

  const healthCounts: Record<ProjectHealth, number> = { ON_TRACK: 0, AT_RISK: 0, DELAYED: 0 };
  for (const project of projects) {
    const health = computeProjectHealth({
      status: project.status,
      targetDate: project.targetDate,
      overdueTaskCount: overdueMap.get(project.id) ?? 0,
      now,
    });
    healthCounts[health]++;
  }

  const overdueTaskCount = await prisma.task.count({
    where: {
      project: { companyId, archivedAt: null },
      status: { not: TaskStatus.DONE },
      dueDate: { lt: now },
    },
  });

  const outstanding = await prisma.invoice.aggregate({
    where: {
      project: { companyId },
      status: { in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] },
      archivedAt: null,
    },
    _sum: { amount: true },
  });

  const fourteenDaysOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const upcomingMilestones = await prisma.invoice.findMany({
    where: {
      project: { companyId },
      status: { in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] },
      dueDate: { gte: now, lte: fourteenDaysOut },
      archivedAt: null,
    },
    orderBy: { dueDate: "asc" },
    select: {
      id: true,
      description: true,
      amount: true,
      dueDate: true,
      status: true,
      project: { select: { id: true, name: true } },
    },
  });

  return {
    activeProjectCount: projects.length,
    healthCounts,
    overdueTaskCount,
    outstandingInvoiceTotal: (Number(outstanding._sum.amount) || 0).toFixed(2),
    upcomingMilestones,
  };
}
