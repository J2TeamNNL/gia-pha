import type { Seniority, SeniorityInput } from "./types";

/**
 * XH-002 — compares `a` against the connecting relative `b` (e.g. an uncle
 * against the parent through which they were reached), never against ego.
 * Priority: birth_order, then birth_year/month/day, then UNKNOWN.
 */
export function compareSeniority(a: SeniorityInput, b: SeniorityInput): Seniority {
  const byOrder = compareField(a.birth_order, b.birth_order);
  if (byOrder) return byOrder;

  const byYear = compareField(a.birth_year, b.birth_year);
  if (byYear) return byYear;

  const byMonth = compareField(a.birth_month, b.birth_month);
  if (byMonth) return byMonth;

  const byDay = compareField(a.birth_day, b.birth_day);
  if (byDay) return byDay;

  return "UNKNOWN";
}

function compareField(
  a: number | null | undefined,
  b: number | null | undefined,
): Seniority | undefined {
  if (a == null || b == null || a === b) return undefined;
  return a < b ? "ELDER" : "YOUNGER";
}
