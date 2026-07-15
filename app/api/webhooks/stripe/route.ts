import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
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

// Not behind withAuth — Stripe calls this directly, unauthenticated by our
// own JWT system. Trust is established purely via signature verification
// against the RAW request body (a parsed/re-serialized body won't match the
// signature Stripe computed, so req.text() — not req.json() — is required).
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      const invoiceId = session.metadata?.invoiceId ?? session.client_reference_id;
      if (invoiceId) {
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);

        // updateMany + a status guard makes this idempotent: Stripe retries
        // webhook delivery, and an already-PAID invoice just matches zero
        // rows — count tells us whether this call is the one that actually
        // flipped it, so notifications fire exactly once.
        const updated = await prisma.invoice.updateMany({
          where: { id: invoiceId, status: { not: InvoiceStatus.PAID } },
          data: { status: InvoiceStatus.PAID, stripePaymentId: paymentIntentId },
        });

        if (updated.count > 0) {
          await notifyPaidInvoice(invoiceId).catch((error) => {
            console.error("Failed to send invoice-paid notifications:", error);
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
