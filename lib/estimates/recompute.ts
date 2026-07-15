import type { Prisma } from "@/lib/generated/prisma/client";
import { computeTotal } from "@/lib/estimates/calculations";

type TxClient = Prisma.TransactionClient;

export async function recomputeEstimateTotal(tx: TxClient, estimateId: string) {
  const lineItems = await tx.estimateLineItem.findMany({ where: { estimateId } });
  const total = computeTotal(lineItems);
  await tx.estimate.update({ where: { id: estimateId }, data: { total } });
}

export async function recomputeChangeOrderTotal(tx: TxClient, changeOrderId: string) {
  const lineItems = await tx.changeOrderLineItem.findMany({ where: { changeOrderId } });
  const total = computeTotal(lineItems);
  await tx.changeOrder.update({ where: { id: changeOrderId }, data: { total } });
}
