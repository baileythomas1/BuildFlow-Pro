import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { InvoiceStatus } from "@/lib/generated/prisma/client";
import { notifyPaidInvoice } from "@/lib/invoices/notify-paid";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// PRD 17 Risk: "Stripe/webhook reliability for invoice status — reconcile
// invoice status via a scheduled job in addition to webhooks, not webhooks
// alone." Triggered by Vercel Cron (see vercel.json); protected by a shared
// secret rather than a user JWT since there's no logged-in user involved.
//
// Two independent jobs in one pass:
//   1. Any PENDING invoice with a Checkout Session gets its true status
//      pulled directly from Stripe — catches a webhook that never arrived.
//   2. Any PENDING invoice past its due date is promoted to OVERDUE; Stripe
//      has no notion of our internal due dates, so only this job can do it.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${requireEnv("CRON_SECRET")}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pendingWithSession = await prisma.invoice.findMany({
    where: { status: InvoiceStatus.PENDING, stripeSessionId: { not: null }, archivedAt: null },
  });

  let reconciledToPaid = 0;
  for (const invoice of pendingWithSession) {
    try {
      const session = await stripe.checkout.sessions.retrieve(invoice.stripeSessionId!);
      if (session.payment_status === "paid") {
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.PAID, stripePaymentId: paymentIntentId },
        });
        await notifyPaidInvoice(invoice.id).catch((error) => {
          console.error("Failed to send invoice-paid notifications:", error);
        });
        reconciledToPaid++;
      }
    } catch {
      // A bad/expired session shouldn't block the rest of the batch.
    }
  }

  const overdueResult = await prisma.invoice.updateMany({
    where: { status: InvoiceStatus.PENDING, dueDate: { lt: new Date() }, archivedAt: null },
    data: { status: InvoiceStatus.OVERDUE },
  });

  return NextResponse.json({ reconciledToPaid, markedOverdue: overdueResult.count });
}
