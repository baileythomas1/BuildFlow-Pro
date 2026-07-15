import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/client";
import { computeDashboard } from "@/lib/dashboard/overview";

// PRD 9.9 explicitly scopes this to "Owner/Admin view" — narrower than the
// general nav table (PRD 8), which also lists Dashboard for PM. Built to
// match the functional requirement's exact wording rather than the IA sketch.
export const GET = withAuth(
  async (_req, auth) => {
    const dashboard = await computeDashboard(auth.companyId);
    return NextResponse.json(dashboard);
  },
  { roles: [Role.OWNER, Role.ADMIN] }
);
