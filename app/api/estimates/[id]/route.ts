import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { EstimateStatus, Role } from "@/lib/generated/prisma/client";
import { isEstimateEditable, isValidEstimateStatus } from "@/lib/estimates/validate";
import { ESTIMATE_DETAIL_INCLUDE, loadEstimateForAuth } from "@/lib/estimates/access";

type RouteCtx = { params: Promise<{ id: string }> };

export const GET = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id } = await params;
    const estimate = await loadEstimateForAuth(id, auth);
    if (!estimate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ estimate });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM, Role.CLIENT] }
);

// status only ever toggles DRAFT<->SENT here. APPROVED/REJECTED only ever
// come from the client-only approve/reject endpoints, and once set, this
// route refuses further edits — that's the immutability guarantee. title is
// just a display label, not financial data, but stays under the same
// editable-only gate for consistency (one immutability rule, not two).
export const PATCH = withAuth<RouteCtx>(
  async (req: NextRequest, auth, { params }) => {
    const { id } = await params;

    const existing = await prisma.estimate.findFirst({
      where: { id, project: { companyId: auth.companyId } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!isEstimateEditable(existing.status)) {
      return NextResponse.json(
        { error: "Approved or rejected estimates are immutable — create a change order instead" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { status, title } = body as Record<string, unknown>;
    if (status === undefined && title === undefined) {
      return NextResponse.json({ error: "status or title is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};

    if (status !== undefined) {
      if (!isValidEstimateStatus(status) || (status !== EstimateStatus.DRAFT && status !== EstimateStatus.SENT)) {
        return NextResponse.json({ error: "status must be DRAFT or SENT" }, { status: 400 });
      }
      data.status = status;
    }

    if (title !== undefined) {
      if (title !== null && typeof title !== "string") {
        return NextResponse.json({ error: "title must be a string" }, { status: 400 });
      }
      data.title = typeof title === "string" && title.trim() ? title.trim() : null;
    }

    const estimate = await prisma.estimate.update({
      where: { id: existing.id },
      data,
      include: ESTIMATE_DETAIL_INCLUDE,
    });

    return NextResponse.json({ estimate });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM] }
);

export const DELETE = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id } = await params;

    const existing = await prisma.estimate.findFirst({
      where: { id, project: { companyId: auth.companyId } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.archivedAt) {
      return NextResponse.json({ error: "Estimate already archived" }, { status: 409 });
    }

    const estimate = await prisma.estimate.update({
      where: { id: existing.id },
      data: { archivedAt: new Date() },
    });

    return NextResponse.json({ estimate });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM] }
);
