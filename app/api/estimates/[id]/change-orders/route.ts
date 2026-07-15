import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { EstimateStatus, Role } from "@/lib/generated/prisma/client";
import { resolveClientProject } from "@/lib/client-access";
import { parseLineItemInput } from "@/lib/estimates/validate";
import { recomputeChangeOrderTotal } from "@/lib/estimates/recompute";

type RouteCtx = { params: Promise<{ id: string }> };

const CHANGE_ORDER_INCLUDE = {
  lineItems: { orderBy: { createdAt: "asc" as const } },
  createdBy: { select: { id: true, name: true } },
};

export const GET = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id: estimateId } = await params;

    const estimate = await prisma.estimate.findFirst({
      where: { id: estimateId, project: { companyId: auth.companyId } },
      include: { project: { select: { id: true, clientId: true } } },
    });
    if (!estimate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (auth.role === Role.CLIENT) {
      const project = await resolveClientProject(auth.userId, auth.companyId, estimate.project.id);
      if (!project) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const changeOrders = await prisma.changeOrder.findMany({
      where: { estimateId },
      orderBy: { createdAt: "asc" },
      include: CHANGE_ORDER_INCLUDE,
    });
    return NextResponse.json({ changeOrders });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM, Role.CLIENT] }
);

// The only mechanism for changing an approved Estimate's scope/cost — never
// an edit to the Estimate or its line items. A ChangeOrder is create-only:
// no PATCH/DELETE route exists for it, by design (PRD 9.5 audit trail).
export const POST = withAuth<RouteCtx>(
  async (req: NextRequest, auth, { params }) => {
    const { id: estimateId } = await params;

    const estimate = await prisma.estimate.findFirst({
      where: { id: estimateId, project: { companyId: auth.companyId } },
    });
    if (!estimate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (estimate.status !== EstimateStatus.APPROVED) {
      return NextResponse.json(
        { error: "Change orders can only be created against an approved estimate" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { description, lineItems } = body as Record<string, unknown>;

    if (typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
    }
    const parsedLineItems = lineItems.map(parseLineItemInput);
    if (parsedLineItems.some((item) => item === null)) {
      return NextResponse.json(
        { error: "Each line item needs a description, quantity, unitCost, and markup" },
        { status: 400 }
      );
    }
    const validLineItems = parsedLineItems.filter((item) => item !== null);

    const changeOrder = await prisma.$transaction(async (tx) => {
      const created = await tx.changeOrder.create({
        data: { estimateId, createdById: auth.userId, description: description.trim() },
      });
      await tx.changeOrderLineItem.createMany({
        data: validLineItems.map((item) => ({ ...item, changeOrderId: created.id })),
      });
      await recomputeChangeOrderTotal(tx, created.id);
      return tx.changeOrder.findUniqueOrThrow({
        where: { id: created.id },
        include: CHANGE_ORDER_INCLUDE,
      });
    });

    return NextResponse.json({ changeOrder }, { status: 201 });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM] }
);
