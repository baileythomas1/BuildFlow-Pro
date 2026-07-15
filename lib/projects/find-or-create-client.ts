import { prisma } from "@/lib/prisma";

// PRD 9.2 lists "client" as a field captured on the project form, not a
// standalone module — so project creation accepts inline client details and
// reuses an existing Client (matched by email within the company) rather
// than requiring a separate client-management flow to exist first.
export async function findOrCreateClient(
  companyId: string,
  input: { name: string; email: string }
) {
  const existing = await prisma.client.findFirst({
    where: { companyId, email: input.email },
  });
  if (existing) return existing;

  return prisma.client.create({
    data: { companyId, name: input.name, email: input.email },
  });
}
