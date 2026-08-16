/**
 * XH-007 — joins the pure resolver to the branch layer.
 * The resolver answers for one (ego, target) pair in one dialect; the branch
 * layer knows which dialect a person is addressed in. A person can sit in more
 * than one branch, so a target can carry more than one correct term.
 */
import { resolveAddress } from "./dictionaries";
import { REGION_PROFILES } from "./dictionaries";
import { resolvePath } from "./path";
import type {
  AddressResolution,
  KinshipPerson,
  KinshipRelationship,
  RegionCode,
  RegionProfile,
} from "./types";

export interface BranchDialect {
  id: string;
  name: string;
  regionCode: RegionCode;
  /** Set when the branch uses a provincial variant such as `TRUNG:QUANG_TRI`. */
  profileCode?: string;
}

export interface AddressContext {
  persons: readonly KinshipPerson[];
  relationships: readonly KinshipRelationship[];
  /** Branch ids each person belongs to, derived and manual alike. */
  branchesByPerson: ReadonlyMap<string, readonly string[]>;
  branchesById: ReadonlyMap<string, BranchDialect>;
  /** Used when the target belongs to no branch at all. */
  fallbackRegion: RegionCode;
}

export interface BranchAddress {
  branch: BranchDialect | null;
  resolution: AddressResolution;
  /**
   * Set when the term was resolved from someone else's position — a spouse
   * whose branch this is. Vietnamese calls this "gọi thay ngôi": you address
   * your spouse's relatives as your spouse does.
   */
  viaPersonId?: string;
}

const COUPLE_TYPES = new Set(["SPOUSE", "EX_SPOUSE"]);

export function profileFor(branch: BranchDialect | null, fallback: RegionCode): RegionProfile {
  const code = branch?.profileCode ?? branch?.regionCode ?? fallback;
  return REGION_PROFILES[code] ?? REGION_PROFILES[branch?.regionCode ?? fallback];
}

function partnersOf(
  personId: string,
  relationships: readonly KinshipRelationship[],
): string[] {
  const partners: string[] = [];
  for (const relationship of relationships) {
    if (!COUPLE_TYPES.has(relationship.rel_type)) continue;
    if (relationship.person_id === personId) partners.push(relationship.related_to_id);
    else if (relationship.related_to_id === personId) partners.push(relationship.person_id);
  }
  return partners;
}

/**
 * Picks whose position the term is spoken from. Ego speaks for themselves
 * whenever they share the branch; otherwise a spouse who belongs to it lends
 * their position, which is what a Vietnamese speaker actually does.
 */
function speakerFor(
  egoId: string,
  branchId: string | null,
  context: AddressContext,
): { speakerId: string; via?: string } {
  if (!branchId) return { speakerId: egoId };
  const egoBranches = context.branchesByPerson.get(egoId) ?? [];
  if (egoBranches.includes(branchId)) return { speakerId: egoId };

  for (const partnerId of partnersOf(egoId, context.relationships)) {
    const partnerBranches = context.branchesByPerson.get(partnerId) ?? [];
    if (partnerBranches.includes(branchId)) {
      return { speakerId: partnerId, via: partnerId };
    }
  }
  return { speakerId: egoId };
}

export function resolveBranchAddresses(
  egoId: string,
  targetId: string,
  context: AddressContext,
): BranchAddress[] {
  const personById = new Map(context.persons.map((person) => [person.id, person]));
  const branchIds = context.branchesByPerson.get(targetId) ?? [];
  const applicable: (string | null)[] = branchIds.length ? [...branchIds] : [null];

  return applicable.map((branchId) => {
    const branch = branchId ? (context.branchesById.get(branchId) ?? null) : null;
    const { speakerId, via } = speakerFor(egoId, branchId, context);
    const speaker = personById.get(speakerId);
    const path = resolvePath(
      speakerId,
      targetId,
      context.persons,
      context.relationships,
    );
    const resolution = resolveAddress(
      profileFor(branch, context.fallbackRegion),
      path,
      speaker?.gender ?? "UNKNOWN",
    );
    return via ? { branch, resolution, viaPersonId: via } : { branch, resolution };
  });
}
