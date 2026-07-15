import { ProjectStatus } from "@/lib/generated/prisma/client";

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

export function parseOptionalDate(value: unknown): { ok: true; date: Date | null } | { ok: false } {
  if (value === undefined || value === null || value === "") return { ok: true, date: null };
  if (typeof value !== "string") return { ok: false };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { ok: false };
  return { ok: true, date };
}
