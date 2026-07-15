import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/client";

// Always scoped to auth.userId — every role reads only their own
// notifications, no company/role check needed beyond "it's yours."
export const GET = withAuth(
  async (_req, auth) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: auth.userId, readAt: null },
    });
    return NextResponse.json({ notifications, unreadCount });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM, Role.EMPLOYEE, Role.CLIENT] }
);
