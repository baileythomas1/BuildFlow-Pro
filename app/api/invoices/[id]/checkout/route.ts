import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { InvoiceStatus, Role } from "@/lib/generated/prisma/client";
import { loadInvoiceForAuth } from "@/lib/invoices/access";
import { stripe } from "@/lib/stripe";

type RouteCtx = { params: Promise<{ id: string }> };

// PRD 9.5: "Stripe-hosted checkout for payment." Available to the paying
// homeowner (self-serve) and to internal staff (to generate a payment link
// to send). There's no client portal page yet, so the redirect destination
// after payment is the generic home page rather than a project-specific view.
export const POST = withAuth<RouteCtx>(
  async (req: NextRequest, auth, { params }) => {
    const { id } = await params;

    const invoice = await loadInvoiceForAuth(id, auth);
    if (!invoice) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (invoice.archivedAt) {
      return NextResponse.json({ error: "Invoice is archived" }, { status: 400 });
    }
    if (invoice.status === InvoiceStatus.PAID) {
      return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });
    }

    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(Number(invoice.amount) * 100),
            product_data: { name: invoice.description },
          },
          quantity: 1,
        },
      ],
      metadata: { invoiceId: invoice.id },
      client_reference_id: invoice.id,
      success_url: `${origin}/?payment=success`,
      cancel_url: `${origin}/?payment=cancelled`,
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM, Role.CLIENT] }
);
