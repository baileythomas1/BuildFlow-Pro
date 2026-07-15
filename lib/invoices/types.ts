export type InvoiceStatusValue = "PENDING" | "PAID" | "OVERDUE";

export type Invoice = {
  id: string;
  description: string;
  amount: string;
  status: InvoiceStatusValue;
  dueDate: string | null;
  estimateId: string | null;
  archivedAt: string | null;
  createdAt: string;
};
