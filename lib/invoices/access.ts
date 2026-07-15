import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/client";

export async function loadInvoiceForAuth(id: string, auth: { role: Role; userId: string; companyId: string }) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, project: { companyId: auth.companyId } },
    include: { project: { select: { clientId: true } } },
  });
  if (!invoice) return null;

  if (auth.role === Role.CLIENT) {
    const client = await prisma.client.findFirst({
      where: { userId: auth.userId, companyId: auth.companyId },
    });
    if (!client || client.id !== invoice.project.clientId) return null;
  }

  return invoice;
}
