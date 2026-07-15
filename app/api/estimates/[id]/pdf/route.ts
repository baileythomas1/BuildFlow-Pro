import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { Role } from "@/lib/generated/prisma/client";
import { loadEstimateForAuth } from "@/lib/estimates/access";
import { generateEstimatePdf } from "@/lib/estimates/pdf";

type RouteCtx = { params: Promise<{ id: string }> };

export const GET = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id } = await params;
    const estimate = await loadEstimateForAuth(id, auth);
    if (!estimate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const pdf = await generateEstimatePdf({
      companyName: estimate.project.company.name,
      projectName: estimate.project.name,
      projectAddress: estimate.project.address,
      clientName: estimate.project.client.name,
      status: estimate.status,
      createdAt: estimate.createdAt,
      lineItems: estimate.lineItems,
      total: estimate.total,
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="estimate-${estimate.id}.pdf"`,
      },
    });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM, Role.CLIENT] }
);
