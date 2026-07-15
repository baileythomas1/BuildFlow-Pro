import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/client";

// PRD 8: "Employees" is an Owner/Admin-only nav item — unlike Estimates/
// Invoices/Files, PM doesn't have roster access (pay rates are sensitive).
export const GET = withAuth(
  async (_req, auth) => {
    const users = await prisma.user.findMany({
      where: { companyId: auth.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        hourlyRate: true,
        projectAssignments: {
          select: { project: { select: { id: true, name: true, archivedAt: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    const employees = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      hourlyRate: u.hourlyRate,
      assignedProjects: u.projectAssignments
        .map((pa) => pa.project)
        .filter((p) => !p.archivedAt)
        .map((p) => ({ id: p.id, name: p.name })),
    }));

    return NextResponse.json({ employees });
  },
  { roles: [Role.OWNER, Role.ADMIN] }
);
