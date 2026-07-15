export function parseOptionalDate(value: unknown): { ok: true; date: Date | null } | { ok: false } {
  if (value === undefined || value === null || value === "") return { ok: true, date: null };
  if (typeof value !== "string") return { ok: false };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { ok: false };
  return { ok: true, date };
}
