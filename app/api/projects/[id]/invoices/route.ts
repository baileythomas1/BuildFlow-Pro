import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/client";
import { resolveClientProject } from "@/lib/client-access";
import { parseAmount } from "@/lib/invoices/validate";
import { parseOptionalDate } from "@/lib/validate";
import { notifyInvoiceSent } from "@/lib/notifications/events";

type RouteCtx = { params: Promise<{ id: string }> };

const INVOICE_SELECT = {
  id: true,
  description: true,
  amount: true,
  status: true,
  dueDate: true,
  estimateId: true,
  archivedAt: true,
  createdAt: true,
} as const;

// PRD 9.6: "Invoices/Payments" is part of the client portal — unlike
// Estimates, a Client sees every invoice on their project (there's no
// draft/internal-only invoice state to hide).
export const GET = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id: projectId } = await params;

    if (auth.role === Role.CLIENT) {
      const project = await resolveClientProject(auth.userId, auth.companyId, projectId);
      if (!project) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const invoices = await prisma.invoice.findMany({
        where: { projectId, archivedAt: null },
        orderBy: { createdAt: "desc" },
        select: INVOICE_SELECT,
      });
      return NextResponse.json({ invoices });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId: auth.companyId },
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const invoices = await prisma.invoice.findMany({
      where: { projectId, archivedAt: null },
      orderBy: { createdAt: "desc" },
      select: INVOICE_SELECT,
    });
    return NextResponse.json({ invoices });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM, Role.CLIENT] }
);

// Milestone-based (estimateId set, drawing against an approved budget) or
// ad hoc (estimateId omitted) — both are just an Invoice row; PRD 11 doesn't
// call for a separate Milestone entity.
export const POST = withAuth<RouteCtx>(
  async (req: NextRequest, auth, { params }) => {
    const { id: projectId } = await params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId: auth.companyId },
      include: { client: true, company: { select: { name: true } } },
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { description, amount, estimateId, dueDate } = body as Record<string, unknown>;

    if (typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }
    const parsedAmount = parseAmount(amount);
    if (parsedAmount === null) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }

    let resolvedEstimateId: string | null = null;
    if (estimateId !== undefined && estimateId !== null) {
      if (typeof estimateId !== "string") {
        return NextResponse.json({ error: "Invalid estimate" }, { status: 400 });
      }
      const estimate = await prisma.estimate.findFirst({ where: { id: estimateId, projectId } });
      if (!estimate) {
        return NextResponse.json({ error: "Invalid estimate" }, { status: 400 });
      }
      resolvedEstimateId = estimate.id;
    }

    const dueDateResult = parseOptionalDate(dueDate);
    if (!dueDateResult.ok) {
      return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    }

    const invoice = await prisma.invoice.create({
      data: {
        projectId,
        estimateId: resolvedEstimateId,
        description: description.trim(),
        amount: parsedAmount,
        dueDate: dueDateResult.date,
      },
      select: INVOICE_SELECT,
    });

    await notifyInvoiceSent({
      invoiceId: invoice.id,
      description: invoice.description,
      amount: invoice.amount.toString(),
      projectName: project.name,
      companyName: project.company.name,
      client: { userId: project.client.userId, email: project.client.email, name: project.client.name },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM] }
);
