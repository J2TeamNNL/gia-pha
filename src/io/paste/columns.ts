/**
 * Maps the header row of a pasted table onto the fields the importer knows.
 * Headers are matched without diacritics so `Nam sinh` and `Năm sinh` agree.
 */

export type ColumnKey =
  | "fullName"
  | "gender"
  | "birthYear"
  | "deathYear"
  | "father"
  | "mother"
  | "spouse"
  | "phone"
  | "address"
  | "note";

const HEADER_SYNONYMS: Record<ColumnKey, readonly string[]> = {
  fullName: ["ho ten", "ho va ten", "ten", "ten day du", "name", "full name"],
  gender: ["gioi tinh", "gt", "gioi", "sex", "gender"],
  birthYear: ["nam sinh", "ns", "sinh", "birth", "birth year", "year of birth"],
  deathYear: ["nam mat", "mat", "nam mat (neu co)", "death", "death year"],
  father: ["cha", "bo", "ba", "father"],
  mother: ["me", "ma", "mother"],
  spouse: ["vo", "chong", "vo/chong", "vo chong", "ban doi", "spouse", "wife", "husband"],
  phone: ["dien thoai", "so dien thoai", "sdt", "phone", "mobile"],
  address: ["dia chi", "address"],
  note: ["ghi chu", "note", "notes", "remark"],
};

/** The order assumed when the first row is data rather than a header. */
export const DEFAULT_COLUMNS: readonly ColumnKey[] = [
  "fullName",
  "gender",
  "birthYear",
  "father",
  "mother",
  "spouse",
];

export function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9/ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchHeader(value: string): ColumnKey | null {
  const normalized = normalizeHeader(value);
  if (!normalized) return null;
  for (const [key, synonyms] of Object.entries(HEADER_SYNONYMS)) {
    if (synonyms.includes(normalized)) return key as ColumnKey;
  }
  return null;
}

export interface ColumnMapping {
  columns: (ColumnKey | null)[];
  hasHeader: boolean;
}

export function mapColumns(firstRow: readonly string[]): ColumnMapping {
  const matched = firstRow.map(matchHeader);
  // A header must name the one column the importer cannot work without,
  // otherwise a data row whose first cell happens to read "Ba" would be eaten.
  if (matched.includes("fullName")) return { columns: matched, hasHeader: true };
  return {
    columns: firstRow.map((_, index) => DEFAULT_COLUMNS[index] ?? null),
    hasHeader: false,
  };
}
