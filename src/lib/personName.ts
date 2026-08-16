import type { Person } from "@/db/types";

/** Lowercase and strip Vietnamese diacritics so "nguyen" matches "Nguyễn". */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function displayName(person: Pick<Person, "first_name" | "last_name" | "middle_name">): string {
  return [person.last_name, person.middle_name, person.first_name]
    .filter(Boolean)
    .join(" ");
}

export interface SplitName {
  first_name: string;
  middle_name?: string;
  last_name?: string;
}

/**
 * Splits a Vietnamese full name written surname-first: the first word is the
 * surname, the last word the given name, anything between is the middle name.
 */
export function splitFullName(value: string): SplitName {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return { first_name: words[0] ?? "" };
  const [last, ...rest] = words;
  const first = rest.pop() as string;
  return {
    last_name: last,
    middle_name: rest.length ? rest.join(" ") : undefined,
    first_name: first,
  };
}
