import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/client";

type RouteCtx = { params: Promise<{ id: string }> };

export const PATCH = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id } = await params;

    const existing = await prisma.notification.findFirst({ where: { id, userId: auth.userId } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const notification = await prisma.notification.update({
      where: { id: existing.id },
      data: { readAt: existing.readAt ?? new Date() },
    });

    return NextResponse.json({ notification });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM, Role.EMPLOYEE, Role.CLIENT] }
);
