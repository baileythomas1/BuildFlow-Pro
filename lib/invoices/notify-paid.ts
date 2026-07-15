import { prisma } from "@/lib/prisma";
import { notifyInvoicePaid } from "@/lib/notifications/events";

// Shared by both places an invoice can transition to PAID: the Stripe
// webhook and the reconciliation cron (PRD 17) that catches whatever the
// webhook missed. Both call this only after confirming (via an updateMany
// count) that this call is the one that actually flipped the status, so
// notifications fire exactly once regardless of which path caught it.
export async function notifyPaidInvoice(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { project: { include: { client: true } } },
  });
  if (!invoice) return;

  await notifyInvoicePaid({
    invoiceId: invoice.id,
    description: invoice.description,
    amount: invoice.amount.toString(),
    projectId: invoice.projectId,
    projectName: invoice.project.name,
    client: {
      userId: invoice.project.client.userId,
      email: invoice.project.client.email,
      name: invoice.project.client.name,
    },
    companyId: invoice.project.companyId,
  });
}
