import { prisma } from "@/lib/prisma";

// For CLIENT-role users: resolves the Client profile linked to their login
// and confirms the given project belongs to that Client. Returns null if
// the user has no linked Client profile or the project isn't theirs —
// callers should treat both cases identically (404), never leaking which.
export async function resolveClientProject(userId: string, companyId: string, projectId: string) {
  const client = await prisma.client.findFirst({ where: { userId, companyId } });
  if (!client) return null;
  return prisma.project.findFirst({ where: { id: projectId, companyId, clientId: client.id } });
}

// For the portal, where the client doesn't know their project id upfront —
// Phase 1 assumes exactly one project per Client (PRD 11).
export async function resolveOwnClientProject(userId: string, companyId: string) {
  const client = await prisma.client.findFirst({ where: { userId, companyId } });
  if (!client) return null;
  return prisma.project.findFirst({ where: { companyId, clientId: client.id, archivedAt: null } });
}
