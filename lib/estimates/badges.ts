import type { EstimateStatusValue } from "@/lib/estimates/types";

export function estimateStatusBadge(
  status: EstimateStatusValue
): { label: string; tone: "slate" | "sky" | "green" | "red" } {
  switch (status) {
    case "SENT":
      return { label: "Sent", tone: "sky" };
    case "APPROVED":
      return { label: "Approved", tone: "green" };
    case "REJECTED":
      return { label: "Rejected", tone: "red" };
    default:
      return { label: "Draft", tone: "slate" };
  }
}
