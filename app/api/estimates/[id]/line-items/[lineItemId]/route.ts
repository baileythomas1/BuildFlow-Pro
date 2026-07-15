import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/client";
import { isEstimateEditable, parseLineItemInput } from "@/lib/estimates/validate";
import { recomputeEstimateTotal } from "@/lib/estimates/recompute";

type RouteCtx = { params: Promise<{ id: string; lineItemId: string }> };

async function loadEditableLineItem(estimateId: string, lineItemId: string, companyId: string) {
  const lineItem = await prisma.estimateLineItem.findFirst({
    where: { id: lineItemId, estimateId, estimate: { project: { companyId } } },
    include: { estimate: true },
  });
  if (!lineItem) return { error: "Not found" as const, status: 404 };
  if (!isEstimateEditable(lineItem.estimate.status)) {
    return {
      error: "Approved or rejected estimates are immutable — create a change order instead" as const,
      status: 400,
    };
  }
  return { lineItem };
}

export const PATCH = withAuth<RouteCtx>(
  async (req: NextRequest, auth, { params }) => {
    const { id: estimateId, lineItemId } = await params;

    const result = await loadEditableLineItem(estimateId, lineItemId, auth.companyId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = parseLineItemInput(body);
    if (!parsed) {
      return NextResponse.json(
        { error: "description, quantity, unitCost, and markup are required" },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.estimateLineItem.update({ where: { id: lineItemId }, data: parsed });
      await recomputeEstimateTotal(tx, estimateId);
      return item;
    });

    return NextResponse.json({ lineItem: updated });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM] }
);

export const DELETE = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id: estimateId, lineItemId } = await params;

    const result = await loadEditableLineItem(estimateId, lineItemId, auth.companyId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await prisma.$transaction(async (tx) => {
      await tx.estimateLineItem.delete({ where: { id: lineItemId } });
      await recomputeEstimateTotal(tx, estimateId);
    });

    return NextResponse.json({ success: true });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM] }
);
