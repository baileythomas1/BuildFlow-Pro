import type { ProjectHealth } from "@/lib/projects/health";

export function healthBadge(health: ProjectHealth): { label: string; tone: "green" | "orange" | "red" } {
  switch (health) {
    case "ON_TRACK":
      return { label: "On Track", tone: "green" };
    case "AT_RISK":
      return { label: "At Risk", tone: "orange" };
    case "DELAYED":
      return { label: "Delayed", tone: "red" };
  }
}

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  COMPLETE: "Complete",
};

export function statusBadge(status: string): { label: string; tone: "slate" | "sky" | "orange" | "green" } {
  switch (status) {
    case "IN_PROGRESS":
      return { label: STATUS_LABELS[status], tone: "sky" };
    case "ON_HOLD":
      return { label: STATUS_LABELS[status], tone: "orange" };
    case "COMPLETE":
      return { label: STATUS_LABELS[status], tone: "green" };
    default:
      return { label: STATUS_LABELS[status] ?? status, tone: "slate" };
  }
}
