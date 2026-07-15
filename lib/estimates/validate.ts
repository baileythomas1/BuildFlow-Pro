import { EstimateStatus } from "@/lib/generated/prisma/client";

const STATUSES = Object.values(EstimateStatus);

export function isValidEstimateStatus(value: unknown): value is EstimateStatus {
  return typeof value === "string" && (STATUSES as string[]).includes(value);
}

// Estimates are only editable while DRAFT or SENT. APPROVED is the locked
// baseline (PRD 9.5); REJECTED is also frozen — start a new estimate rather
// than resurrecting a rejected one.
export function isEstimateEditable(status: EstimateStatus): boolean {
  return status === EstimateStatus.DRAFT || status === EstimateStatus.SENT;
}

function parseNonNegativeDecimal(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return num.toFixed(2);
}

export type LineItemInput = {
  description: string;
  quantity: string;
  unitCost: string;
  markup: string;
};

export function parseLineItemInput(value: unknown): LineItemInput | null {
  if (!value || typeof value !== "object") return null;
  const { description, quantity, unitCost, markup } = value as Record<string, unknown>;

  if (typeof description !== "string" || !description.trim()) return null;

  const q = parseNonNegativeDecimal(quantity);
  const u = parseNonNegativeDecimal(unitCost);
  const m = parseNonNegativeDecimal(markup);
  if (q === null || u === null || m === null) return null;

  return { description: description.trim(), quantity: q, unitCost: u, markup: m };
}
