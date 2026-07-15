import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/client";
import { computeDashboard } from "@/lib/dashboard/overview";

// PRD 8's IA table lists Dashboard for PM / Office Staff too, alongside
// Owner/Admin — PRD 9.9's "Owner/Admin view" phrasing describes the primary
// audience, not an exclusion of PM.
export const GET = withAuth(
  async (_req, auth) => {
    const dashboard = await computeDashboard(auth.companyId);
    return NextResponse.json(dashboard);
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM] }
);
