/**
 * Turns a pasted spreadsheet into a reviewable import plan.
 * Parents and partners are named, not keyed, so every reference is resolved
 * against both the rows being pasted and the people already stored. A name
 * matching more than one person is an error the user resolves by writing the
 * birth year in brackets, never a guess made here.
 */
import type { BulkPerson, BulkRelationship } from "@/db/bulk";
import type { Gender, Person } from "@/db/types";
import { displayName, normalizeName, splitFullName } from "@/lib/personName";
import { type ColumnKey, mapColumns } from "./columns";
import { parseTable } from "./table";

export type IssueSeverity = "ERROR" | "WARNING";

export interface PasteIssue {
  severity: IssueSeverity;
  column?: ColumnKey;
  message: string;
}

export interface PasteRowPlan {
  /** 1-based position among data rows, matching what the preview shows. */
  row: number;
  cells: string[];
  fullName: string;
  person: BulkPerson | null;
  issues: PasteIssue[];
}

export interface PastePlan {
  columns: (ColumnKey | null)[];
  hasHeader: boolean;
  rows: PasteRowPlan[];
  persons: BulkPerson[];
  relationships: BulkRelationship[];
  errorCount: number;
  warningCount: number;
}

const GENDER_WORDS: Record<string, Gender> = {
  nam: "MALE",
  m: "MALE",
  male: "MALE",
  trai: "MALE",
  ong: "MALE",
  nu: "FEMALE",
  f: "FEMALE",
  female: "FEMALE",
  gai: "FEMALE",
  ba: "FEMALE",
  khac: "OTHER",
  other: "OTHER",
};

const PARENT_COLUMNS = ["father", "mother"] as const;

function parseGender(value: string): Gender | null {
  if (!value.trim()) return null;
  return GENDER_WORDS[normalizeName(value)] ?? null;
}

function parseYear(value: string): number | null {
  const match = value.match(/\d{3,4}/);
  if (!match) return null;
  const year = Number(match[0]);
  return year >= 1 && year <= 9999 ? year : null;
}

/** `Nguyễn Văn An (1950)` narrows a reference to one of several same-named people. */
function parseReference(value: string): { name: string; birthYear: number | null } {
  const bracket = value.match(/^(.*?)\s*[([]\s*(\d{3,4})\s*[)\]]\s*$/);
  if (bracket) return { name: bracket[1].trim(), birthYear: Number(bracket[2]) };
  return { name: value.trim(), birthYear: null };
}

interface Candidate {
  externalId: string;
  birthYear: number | null;
}

function buildIndex(
  existing: readonly Person[],
  rows: readonly PasteRowPlan[],
): Map<string, Candidate[]> {
  const index = new Map<string, Candidate[]>();
  const add = (name: string, candidate: Candidate) => {
    const key = normalizeName(name);
    if (!key) return;
    index.set(key, [...(index.get(key) ?? []), candidate]);
  };
  for (const person of existing) {
    add(displayName(person), {
      externalId: person.id,
      birthYear: person.birth_year ?? null,
    });
  }
  for (const row of rows) {
    if (row.person) {
      add(row.fullName, {
        externalId: row.person.externalId,
        birthYear: row.person.birth_year ?? null,
      });
    }
  }
  return index;
}

function cellValue(
  cells: readonly string[],
  columns: readonly (ColumnKey | null)[],
  key: ColumnKey,
): string {
  const position = columns.indexOf(key);
  return position === -1 ? "" : (cells[position] ?? "").trim();
}

function toPerson(
  cells: readonly string[],
  columns: readonly (ColumnKey | null)[],
  row: number,
  issues: PasteIssue[],
): { fullName: string; person: BulkPerson | null } {
  const fullName = cellValue(cells, columns, "fullName");
  if (!fullName) {
    issues.push({
      severity: "ERROR",
      column: "fullName",
      message: "Thiếu họ tên.",
    });
    return { fullName, person: null };
  }

  const genderCell = cellValue(cells, columns, "gender");
  const gender = parseGender(genderCell);
  if (gender === null) {
    issues.push({
      severity: "WARNING",
      column: "gender",
      message: genderCell
        ? `Không hiểu giới tính "${genderCell}"; để trống là chưa rõ.`
        : "Chưa rõ giới tính; xưng hô sẽ không hiện cho tới khi bổ sung.",
    });
  }

  const birthCell = cellValue(cells, columns, "birthYear");
  const birthYear = parseYear(birthCell);
  if (birthCell && birthYear === null) {
    issues.push({
      severity: "WARNING",
      column: "birthYear",
      message: `Không đọc được năm sinh "${birthCell}".`,
    });
  }

  const deathCell = cellValue(cells, columns, "deathYear");
  const deathYear = parseYear(deathCell);
  if (deathCell && deathYear === null) {
    issues.push({
      severity: "WARNING",
      column: "deathYear",
      message: `Không đọc được năm mất "${deathCell}".`,
    });
  }

  return {
    fullName,
    person: {
      externalId: `row-${row}`,
      ...splitFullName(fullName),
      gender: gender ?? "UNKNOWN",
      is_living: deathYear === null,
      birth_year: birthYear ?? undefined,
      death_year: deathYear ?? undefined,
      phone_number: cellValue(cells, columns, "phone") || undefined,
      contact_address: cellValue(cells, columns, "address") || undefined,
      notes: cellValue(cells, columns, "note") || undefined,
    },
  };
}

function resolveReference(
  value: string,
  index: Map<string, Candidate[]>,
  selfExternalId: string,
  column: ColumnKey,
  issues: PasteIssue[],
): string | null {
  const { name, birthYear } = parseReference(value);
  const candidates = index.get(normalizeName(name)) ?? [];
  const narrowed =
    birthYear === null
      ? candidates
      : candidates.filter((candidate) => candidate.birthYear === birthYear);

  if (!narrowed.length) {
    issues.push({
      severity: "ERROR",
      column,
      message: `Không tìm thấy ai tên "${value}" trong danh sách này hoặc trong cây.`,
    });
    return null;
  }
  if (narrowed.length > 1) {
    issues.push({
      severity: "ERROR",
      column,
      message: `Có ${narrowed.length} người tên "${name}". Ghi thêm năm sinh trong ngoặc, ví dụ "${name} (1950)".`,
    });
    return null;
  }
  if (narrowed[0].externalId === selfExternalId) {
    issues.push({
      severity: "ERROR",
      column,
      message: "Một người không thể là người thân của chính mình.",
    });
    return null;
  }
  return narrowed[0].externalId;
}

export function planPaste(
  text: string,
  existing: readonly Person[] = [],
): PastePlan {
  const table = parseTable(text);
  if (!table.length) {
    return {
      columns: [],
      hasHeader: false,
      rows: [],
      persons: [],
      relationships: [],
      errorCount: 0,
      warningCount: 0,
    };
  }

  const { columns, hasHeader } = mapColumns(table[0]);
  const dataRows = hasHeader ? table.slice(1) : table;

  const rows: PasteRowPlan[] = dataRows.map((cells, position) => {
    const row = position + 1;
    const issues: PasteIssue[] = [];
    const { fullName, person } = toPerson(cells, columns, row, issues);
    return { row, cells, fullName, person, issues };
  });

  const index = buildIndex(existing, rows);
  const relationships: BulkRelationship[] = [];
  const partnerPairs = new Set<string>();

  for (const row of rows) {
    if (!row.person) continue;
    const externalId = row.person.externalId;

    for (const column of PARENT_COLUMNS) {
      const value = cellValue(row.cells, columns, column);
      if (!value) continue;
      const parentId = resolveReference(
        value,
        index,
        externalId,
        column,
        row.issues,
      );
      if (parentId) {
        relationships.push({
          person_external_id: parentId,
          related_to_external_id: externalId,
          rel_type: "PARENT_OF",
        });
      }
    }

    const spouseCell = cellValue(row.cells, columns, "spouse");
    if (!spouseCell) continue;
    const spouseId = resolveReference(
      spouseCell,
      index,
      externalId,
      "spouse",
      row.issues,
    );
    if (!spouseId) continue;
    // Both spouses usually name each other; keep one edge for the pair.
    const pairKey = [externalId, spouseId].sort().join("|");
    if (partnerPairs.has(pairKey)) continue;
    partnerPairs.add(pairKey);
    relationships.push({
      person_external_id: externalId,
      related_to_external_id: spouseId,
      rel_type: "SPOUSE",
    });
  }

  const failedRows = new Set(
    rows
      .filter((row) => row.issues.some((issue) => issue.severity === "ERROR"))
      .map((row) => row.person?.externalId)
      .filter((value): value is string => Boolean(value)),
  );

  return {
    columns,
    hasHeader,
    rows,
    persons: rows
      .filter((row) => row.person && !row.issues.some((i) => i.severity === "ERROR"))
      .map((row) => row.person as BulkPerson),
    relationships: relationships.filter(
      (relationship) =>
        !failedRows.has(relationship.person_external_id) &&
        !failedRows.has(relationship.related_to_external_id),
    ),
    errorCount: rows.filter((row) =>
      row.issues.some((issue) => issue.severity === "ERROR"),
    ).length,
    warningCount: rows.filter((row) =>
      row.issues.some((issue) => issue.severity === "WARNING"),
    ).length,
  };
}
