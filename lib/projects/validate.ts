import { ProjectStatus } from "@/lib/generated/prisma/client";

export { parseOptionalDate } from "@/lib/validate";

const PROJECT_STATUSES = Object.values(ProjectStatus);

export function isValidProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === "string" && (PROJECT_STATUSES as string[]).includes(value);
}

export function parseBudget(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return num.toFixed(2);
}
