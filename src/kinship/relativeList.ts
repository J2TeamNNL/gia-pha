/**
 * XH-006 — every relative of the reference person with the term used for them.
 * Ordering follows how invitations are actually written: one branch at a time,
 * elders before juniors within a branch.
 */
import { resolveBranchAddresses, type AddressContext } from "./branchContext";
import type { AddressResolution, Register } from "./types";

export interface RelativeRow {
  personId: string;
  branchId: string | null;
  branchName: string | null;
  /** Generations above the reference person; negative means below. */
  generation: number;
  status: AddressResolution["status"];
  call: string | null;
  selfRef: string | null;
  /** Present when the term is spoken from a spouse's position. */
  viaPersonId?: string;
  signature: string;
}

const UP = new Set(["F", "M"]);
const DOWN = new Set(["S", "D"]);

/**
 * Reads generation off the path signature: each F/M hop climbs, each S/D hop
 * descends, and sibling or partner hops stay level.
 */
export function generationOf(signature: string): number {
  if (signature === "SELF" || signature === "DISTANT") return 0;
  let generation = 0;
  for (const character of signature) {
    if (UP.has(character)) generation += 1;
    else if (DOWN.has(character)) generation -= 1;
  }
  return generation;
}

export function buildRelativeRows(
  egoId: string,
  context: AddressContext,
  register: Register = "spoken",
): RelativeRow[] {
  const rows: RelativeRow[] = [];

  for (const person of context.persons) {
    if (person.id === egoId) continue;
    for (const address of resolveBranchAddresses(egoId, person.id, context)) {
      const entry = address.resolution.entry;
      rows.push({
        personId: person.id,
        branchId: address.branch?.id ?? null,
        branchName: address.branch?.name ?? null,
        generation: generationOf(address.resolution.signature),
        status: address.resolution.status,
        call: entry?.[register].call ?? null,
        selfRef: entry?.[register].selfRef ?? null,
        ...(address.viaPersonId ? { viaPersonId: address.viaPersonId } : {}),
        signature: address.resolution.signature,
      });
    }
  }

  return rows;
}

export type SortKey = "kinship" | "name" | "branch" | "generation";

export interface SortInput {
  rows: readonly RelativeRow[];
  nameOf: (personId: string) => string;
  birthYearOf: (personId: string) => number | null;
  key: SortKey;
  descending?: boolean;
}

/** Default order: branch, then elders first, then oldest first within a rank. */
export function sortRelativeRows({
  rows,
  nameOf,
  birthYearOf,
  key,
  descending = false,
}: SortInput): RelativeRow[] {
  const byBranch = (a: RelativeRow, b: RelativeRow) =>
    (a.branchName ?? "￿").localeCompare(b.branchName ?? "￿", "vi");
  const bySeniority = (a: RelativeRow, b: RelativeRow) => {
    if (a.generation !== b.generation) return b.generation - a.generation;
    const yearA = birthYearOf(a.personId);
    const yearB = birthYearOf(b.personId);
    if (yearA !== null && yearB !== null && yearA !== yearB) return yearA - yearB;
    if (yearA === null && yearB !== null) return 1;
    if (yearB === null && yearA !== null) return -1;
    return nameOf(a.personId).localeCompare(nameOf(b.personId), "vi");
  };

  const comparators: Record<SortKey, (a: RelativeRow, b: RelativeRow) => number> = {
    kinship: (a, b) => byBranch(a, b) || bySeniority(a, b),
    generation: bySeniority,
    branch: byBranch,
    name: (a, b) => nameOf(a.personId).localeCompare(nameOf(b.personId), "vi"),
  };

  const sorted = [...rows].sort(comparators[key]);
  return descending ? sorted.reverse() : sorted;
}
