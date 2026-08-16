import type { GedcomNode } from "./types";
import { findChild } from "./records";

export interface ParsedName {
  first_name: string;
  last_name?: string;
  middle_name?: string;
  title_prefix?: string;
  suffix?: string;
}

/**
 * GEDCOM given names carry the family's full given block in original word
 * order (e.g. "Văn An"). We take the last word as `first_name` ("tên") and
 * anything before it as `middle_name` ("tên đệm"), matching Vietnamese usage.
 */
function splitGiven(given: string): { first_name: string; middle_name?: string } {
  const words = given.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { first_name: "" };
  if (words.length === 1) return { first_name: words[0] };
  return { first_name: words[words.length - 1], middle_name: words.slice(0, -1).join(" ") };
}

/** Parses a NAME node's raw "Given /Surname/ Suffix" value plus GIVN/SURN/NPFX substructure. */
export function parseGedcomName(nameNode: GedcomNode): ParsedName {
  const raw = (nameNode.value ?? "").trim();
  const match = /^(.*?)\/([^/]*)\/\s*(.*)$/.exec(raw);
  const given = match ? match[1].trim() : raw;
  const surnameFromSlashes = match ? match[2].trim() : "";
  const suffix = match?.[3]?.trim() || undefined;

  const explicitGiven = findChild(nameNode, "GIVN")?.value?.trim();
  const explicitSurname = findChild(nameNode, "SURN")?.value?.trim();
  const explicitPrefix = findChild(nameNode, "NPFX")?.value?.trim();

  const { first_name, middle_name } = splitGiven(explicitGiven ?? given);

  return {
    first_name,
    middle_name,
    last_name: explicitSurname || surnameFromSlashes || undefined,
    title_prefix: explicitPrefix,
    suffix,
  };
}
