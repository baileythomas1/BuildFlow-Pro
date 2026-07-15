import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/client";
import { isEstimateEditable, parseLineItemInput } from "@/lib/estimates/validate";
import { recomputeEstimateTotal } from "@/lib/estimates/recompute";

type RouteCtx = { params: Promise<{ id: string }> };

export const POST = withAuth<RouteCtx>(
  async (req: NextRequest, auth, { params }) => {
    const { id: estimateId } = await params;

    const estimate = await prisma.estimate.findFirst({
      where: { id: estimateId, project: { companyId: auth.companyId } },
    });
    if (!estimate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!isEstimateEditable(estimate.status)) {
      return NextResponse.json(
        { error: "Approved or rejected estimates are immutable — create a change order instead" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = parseLineItemInput(body);
    if (!parsed) {
      return NextResponse.json(
        { error: "description, quantity, unitCost, and markup are required" },
        { status: 400 }
      );
    }

    const lineItem = await prisma.$transaction(async (tx) => {
      const created = await tx.estimateLineItem.create({ data: { ...parsed, estimateId } });
      await recomputeEstimateTotal(tx, estimateId);
      return created;
    });

    return NextResponse.json({ lineItem }, { status: 201 });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM] }
);
