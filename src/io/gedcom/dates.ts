import type { DatePrecision, DateQualifier, GedcomDate } from "./types";

const MONTHS: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

interface SimpleDate {
  year?: number;
  month?: number;
  day?: number;
}

function parseSimpleDate(text: string): SimpleDate | null {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 1 && /^\d{1,4}$/.test(tokens[0])) {
    return { year: Number(tokens[0]) };
  }
  if (tokens.length === 2 && MONTHS[tokens[0].toUpperCase()] && /^\d{1,4}$/.test(tokens[1])) {
    return { month: MONTHS[tokens[0].toUpperCase()], year: Number(tokens[1]) };
  }
  if (
    tokens.length === 3 &&
    /^\d{1,2}$/.test(tokens[0]) &&
    MONTHS[tokens[1].toUpperCase()] &&
    /^\d{1,4}$/.test(tokens[2])
  ) {
    return { day: Number(tokens[0]), month: MONTHS[tokens[1].toUpperCase()], year: Number(tokens[2]) };
  }
  return null;
}

function precisionOf(parsed: SimpleDate): DatePrecision {
  if (parsed.day !== undefined) return "DAY";
  if (parsed.month !== undefined) return "MONTH";
  return "YEAR";
}

/**
 * Parses a GEDCOM DATE value, preserving whatever precision the source
 * actually has. Anything not recognized (dual dating, calendar escapes,
 * free text) becomes TEXT rather than an invented year/month/day.
 */
export function parseGedcomDate(raw: string): GedcomDate {
  const sourceText = raw.trim();

  const betweenMatch = /^BET\s+(.+?)\s+AND\s+(.+)$/i.exec(sourceText);
  if (betweenMatch) {
    const start = parseSimpleDate(betweenMatch[1]);
    const end = parseSimpleDate(betweenMatch[2]);
    if (start && end) {
      return {
        precision: "RANGE",
        year: start.year,
        month: start.month,
        day: start.day,
        endYear: end.year,
        endMonth: end.month,
        endDay: end.day,
        sourceText,
      };
    }
    return { precision: "TEXT", sourceText };
  }

  const qualifierMatch = /^(ABT|EST|CAL|BEF|AFT)\s+(.+)$/i.exec(sourceText);
  if (qualifierMatch) {
    const qualifier = qualifierMatch[1].toUpperCase() as DateQualifier;
    const parsed = parseSimpleDate(qualifierMatch[2]);
    if (parsed) {
      return { precision: precisionOf(parsed), qualifier, ...parsed, sourceText };
    }
    return { precision: "TEXT", qualifier, sourceText };
  }

  const parsed = parseSimpleDate(sourceText);
  if (parsed) {
    return { precision: precisionOf(parsed), ...parsed, sourceText };
  }
  return { precision: "TEXT", sourceText };
}
