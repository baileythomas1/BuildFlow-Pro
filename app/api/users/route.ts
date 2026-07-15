import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/client";

// List-only: supports the task form's assignee picker. Full roster
// management (hourly rate, assigned-projects roster per PRD 9.7) is a
// separate, not-yet-built module.
export const GET = withAuth(
  async (_req, auth) => {
    const users = await prisma.user.findMany({
      where: { companyId: auth.companyId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ users });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM] }
);
