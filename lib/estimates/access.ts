import { prisma } from "@/lib/prisma";
import { EstimateStatus, Role } from "@/lib/generated/prisma/client";

export const ESTIMATE_DETAIL_INCLUDE = {
  project: {
    select: {
      id: true,
      name: true,
      address: true,
      clientId: true,
      client: { select: { name: true } },
      company: { select: { name: true } },
    },
  },
  lineItems: { orderBy: { createdAt: "asc" as const } },
  changeOrders: {
    orderBy: { createdAt: "asc" as const },
    include: {
      lineItems: { orderBy: { createdAt: "asc" as const } },
      createdBy: { select: { id: true, name: true } },
    },
  },
};

// Company-scoped lookup that also enforces the CLIENT-role rules: a DRAFT
// estimate is invisible to the homeowner, and they can only ever see
// estimates on their own linked project.
export async function loadEstimateForAuth(
  id: string,
  auth: { role: Role; userId: string; companyId: string }
) {
  const estimate = await prisma.estimate.findFirst({
    where: { id, project: { companyId: auth.companyId } },
    include: ESTIMATE_DETAIL_INCLUDE,
  });
  if (!estimate) return null;

  if (auth.role === Role.CLIENT) {
    if (estimate.status === EstimateStatus.DRAFT) return null;
    const client = await prisma.client.findFirst({
      where: { userId: auth.userId, companyId: auth.companyId },
    });
    if (!client || client.id !== estimate.project.clientId) return null;
  }

  return estimate;
}
