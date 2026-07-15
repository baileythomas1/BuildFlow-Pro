import { prisma } from "@/lib/prisma";
import { InvoiceStatus, EstimateStatus } from "@/lib/generated/prisma/client";

// PRD 9.6: "budget summary (spent vs. approved, not raw internal costs)".
// approved = the locked baseline (every APPROVED estimate's total) plus any
// change orders against it — change orders have no approval status of their
// own (PRD 9.5: they're only ever created against an already-approved
// estimate), so they count immediately. spent = money actually PAID via
// invoices. Neither figure ever touches Project.budget, which is an
// internal-only field never sent to the client.
export async function computeBudgetSummary(projectId: string) {
  const approvedEstimates = await prisma.estimate.findMany({
    where: { projectId, status: EstimateStatus.APPROVED, archivedAt: null },
    include: { changeOrders: true },
  });

  const approved = approvedEstimates.reduce((sum, estimate) => {
    const changeOrderTotal = estimate.changeOrders.reduce((s, co) => s + Number(co.total), 0);
    return sum + Number(estimate.total) + changeOrderTotal;
  }, 0);

  const paid = await prisma.invoice.aggregate({
    where: { projectId, status: InvoiceStatus.PAID, archivedAt: null },
    _sum: { amount: true },
  });

  return {
    approved: approved.toFixed(2),
    spent: (Number(paid._sum.amount) || 0).toFixed(2),
  };
}

// "Upcoming milestones" maps to milestone-billing invoices (PRD 9.5's
// milestone-based invoices, e.g. "Milestone 1: Framing complete") that
// haven't been paid yet — there's no separate Milestone/Timeline entity in
// the schema, and this is the closest existing concept to a payment-driven
// project checkpoint. Includes OVERDUE too, not just PENDING, since the
// client needs to see what's outstanding either way.
export async function getUpcomingMilestones(projectId: string, limit = 5) {
  return prisma.invoice.findMany({
    where: {
      projectId,
      status: { in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] },
      dueDate: { not: null },
      archivedAt: null,
    },
    orderBy: { dueDate: "asc" },
    take: limit,
    select: { id: true, description: true, amount: true, dueDate: true, status: true },
  });
}
