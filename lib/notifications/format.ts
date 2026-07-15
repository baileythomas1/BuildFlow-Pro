import type { NotificationItem } from "@/lib/notifications/types";

export function formatNotification(n: NotificationItem): string {
  const p = n.payload;
  switch (n.type) {
    case "task_assigned":
      return `New task assigned: ${p.taskTitle}`;
    case "invoice_sent":
      return `New invoice: ${p.description} ($${Number(p.amount).toLocaleString()})`;
    case "invoice_paid":
      return `Payment received: ${p.description}`;
    case "estimate_approved":
      return "An estimate was approved";
    case "estimate_rejected":
      return "An estimate was rejected";
    default:
      return n.type;
  }
}
