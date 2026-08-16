import type { LossEntry, RawGedcomLine } from "./types";

const LINE_PATTERN = /^(\d+)[ \t](?:(@[^@\s]+@)[ \t])?(\S+)(?:[ \t](.*))?$/;

export interface TokenizeResult {
  lines: RawGedcomLine[];
  lossEntries: LossEntry[];
}

/**
 * Splits raw GEDCOM text into leveled lines. Malformed lines are reported
 * and skipped rather than thrown, per the adapter's loss-report contract.
 */
export function tokenizeGedcom(text: string): TokenizeResult {
  const physicalLines = text.split(/\r\n|\r|\n/);
  const lines: RawGedcomLine[] = [];
  const lossEntries: LossEntry[] = [];

  physicalLines.forEach((raw, index) => {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return;

    const match = LINE_PATTERN.exec(trimmed);
    if (!match) {
      lossEntries.push({
        kind: "malformed_line",
        message: `Line does not match "level [xref] tag [value]": ${JSON.stringify(raw)}`,
        line: index + 1,
      });
      return;
    }

    const [, levelText, xref, tag, value] = match;
    lines.push({
      level: Number(levelText),
      xref,
      tag,
      value,
      line: index + 1,
    });
  });

  return { lines, lossEntries };
}

/** Merges CONT (newline-joined) and CONC (directly-joined) values into their preceding line. */
export function mergeContinuations(lines: RawGedcomLine[]): RawGedcomLine[] {
  const merged: RawGedcomLine[] = [];
  for (const line of lines) {
    if ((line.tag === "CONT" || line.tag === "CONC") && merged.length > 0) {
      const previous = merged[merged.length - 1];
      const separator = line.tag === "CONT" ? "\n" : "";
      previous.value = `${previous.value ?? ""}${separator}${line.value ?? ""}`;
      continue;
    }
    merged.push({ ...line });
  }
  return merged;
}
