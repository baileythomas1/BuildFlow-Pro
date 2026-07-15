import { Role } from "@/lib/generated/prisma/client";

const ROLES = Object.values(Role);

export function isValidRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

export function parseOptionalHourlyRate(value: unknown): { ok: true; rate: string | null } | { ok: false } {
  if (value === undefined || value === null || value === "") return { ok: true, rate: null };
  if (typeof value !== "string" && typeof value !== "number") return { ok: false };
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) return { ok: false };
  return { ok: true, rate: num.toFixed(2) };
}
