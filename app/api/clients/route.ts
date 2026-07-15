import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/client";

// List-only: supports the project form's "existing client" picker. Client
// creation happens inline via project creation (see find-or-create-client.ts)
// rather than through a standalone client-management module.
export const GET = withAuth(
  async (_req, auth) => {
    const clients = await prisma.client.findMany({
      where: { companyId: auth.companyId },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ clients });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM] }
);
