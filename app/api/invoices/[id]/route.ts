import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/client";
import { loadInvoiceForAuth } from "@/lib/invoices/access";

type RouteCtx = { params: Promise<{ id: string }> };

const INVOICE_SELECT = {
  id: true,
  projectId: true,
  description: true,
  amount: true,
  status: true,
  dueDate: true,
  estimateId: true,
  stripePaymentId: true,
  archivedAt: true,
  createdAt: true,
} as const;

export const GET = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id } = await params;
    const invoice = await loadInvoiceForAuth(id, auth);
    if (!invoice) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      invoice: {
        id: invoice.id,
        projectId: invoice.projectId,
        description: invoice.description,
        amount: invoice.amount,
        status: invoice.status,
        dueDate: invoice.dueDate,
        estimateId: invoice.estimateId,
        stripePaymentId: invoice.stripePaymentId,
        archivedAt: invoice.archivedAt,
        createdAt: invoice.createdAt,
      },
    });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM, Role.CLIENT] }
);

export const DELETE = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id } = await params;

    const existing = await prisma.invoice.findFirst({
      where: { id, project: { companyId: auth.companyId } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.archivedAt) {
      return NextResponse.json({ error: "Invoice already archived" }, { status: 409 });
    }

    const invoice = await prisma.invoice.update({
      where: { id: existing.id },
      data: { archivedAt: new Date() },
      select: INVOICE_SELECT,
    });

    return NextResponse.json({ invoice });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM] }
);
