import type { InvoiceStatusValue } from "@/lib/invoices/types";

export function invoiceStatusBadge(
  status: InvoiceStatusValue
): { label: string; tone: "orange" | "green" | "red" } {
  switch (status) {
    case "PAID":
      return { label: "Paid", tone: "green" };
    case "OVERDUE":
      return { label: "Overdue", tone: "red" };
    default:
      return { label: "Pending", tone: "orange" };
  }
}
