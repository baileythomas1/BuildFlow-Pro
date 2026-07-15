export function parseAmount(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num.toFixed(2);
}
