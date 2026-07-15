import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/client";
import { isValidRole, parseOptionalHourlyRate } from "@/lib/employees/validate";

type RouteCtx = { params: Promise<{ id: string }> };

export const PATCH = withAuth<RouteCtx>(
  async (req: NextRequest, auth, { params }) => {
    const { id } = await params;

    // Self-service role changes from the roster are a footgun (e.g. the
    // only Owner accidentally demoting themselves) — do it elsewhere,
    // deliberately, not from this list.
    if (id === auth.userId) {
      return NextResponse.json({ error: "You can't edit your own roster entry here" }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({ where: { id, companyId: auth.companyId } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { name, role, hourlyRate } = body as Record<string, unknown>;

    const data: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
      }
      data.name = name.trim();
    }

    if (role !== undefined) {
      if (!isValidRole(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      data.role = role;
    }

    if (hourlyRate !== undefined) {
      const result = parseOptionalHourlyRate(hourlyRate);
      if (!result.ok) {
        return NextResponse.json({ error: "hourlyRate must be a non-negative number" }, { status: 400 });
      }
      data.hourlyRate = result.rate;
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data,
      select: { id: true, name: true, email: true, role: true, hourlyRate: true },
    });

    return NextResponse.json({ employee: updated });
  },
  { roles: [Role.OWNER, Role.ADMIN] }
);
