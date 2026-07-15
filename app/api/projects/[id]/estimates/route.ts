import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { EstimateStatus, Role } from "@/lib/generated/prisma/client";
import { resolveClientProject } from "@/lib/client-access";
import { parseLineItemInput } from "@/lib/estimates/validate";
import { recomputeEstimateTotal } from "@/lib/estimates/recompute";

type RouteCtx = { params: Promise<{ id: string }> };

const ESTIMATE_SUMMARY_SELECT = {
  id: true,
  title: true,
  status: true,
  total: true,
  approvedAt: true,
  archivedAt: true,
  createdAt: true,
} as const;

// PRD 8: Estimates are an Owner/Admin/PM surface — Employees aren't listed
// with Estimates access in the IA, so they're excluded here (unlike Tasks
// and Files, where Employees have real access).
export const GET = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id: projectId } = await params;

    if (auth.role === Role.CLIENT) {
      const project = await resolveClientProject(auth.userId, auth.companyId, projectId);
      if (!project) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      // A DRAFT estimate is still being assembled internally — it isn't
      // visible to the homeowner until explicitly sent.
      const estimates = await prisma.estimate.findMany({
        where: { projectId, status: { not: EstimateStatus.DRAFT }, archivedAt: null },
        orderBy: { createdAt: "desc" },
        select: ESTIMATE_SUMMARY_SELECT,
      });
      return NextResponse.json({ estimates });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId: auth.companyId },
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const estimates = await prisma.estimate.findMany({
      where: { projectId, archivedAt: null },
      orderBy: { createdAt: "desc" },
      select: ESTIMATE_SUMMARY_SELECT,
    });
    return NextResponse.json({ estimates });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM, Role.CLIENT] }
);

export const POST = withAuth<RouteCtx>(
  async (req: NextRequest, auth, { params }) => {
    const { id: projectId } = await params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId: auth.companyId },
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { lineItems, title } = body as Record<string, unknown>;

    if (title !== undefined && title !== null && typeof title !== "string") {
      return NextResponse.json({ error: "title must be a string" }, { status: 400 });
    }
    const resolvedTitle = typeof title === "string" && title.trim() ? title.trim() : null;

    const parsedLineItems = Array.isArray(lineItems) ? lineItems.map(parseLineItemInput) : [];
    if (Array.isArray(lineItems) && parsedLineItems.some((item) => item === null)) {
      return NextResponse.json(
        { error: "Each line item needs a description, quantity, unitCost, and markup" },
        { status: 400 }
      );
    }
    const validLineItems = parsedLineItems.filter((item) => item !== null);

    const estimate = await prisma.$transaction(async (tx) => {
      const created = await tx.estimate.create({ data: { projectId, title: resolvedTitle } });
      if (validLineItems.length > 0) {
        await tx.estimateLineItem.createMany({
          data: validLineItems.map((item) => ({ ...item, estimateId: created.id })),
        });
        await recomputeEstimateTotal(tx, created.id);
      }
      return tx.estimate.findUniqueOrThrow({
        where: { id: created.id },
        include: { lineItems: true },
      });
    });

    return NextResponse.json({ estimate }, { status: 201 });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM] }
);
