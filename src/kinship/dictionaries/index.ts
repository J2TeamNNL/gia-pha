import type {
  AddressEntry,
  AddressPair,
  AddressResolution,
  DictAddressEntry,
  KinshipGender,
  PathResult,
  Register,
  RegionProfile,
} from "../types";
import { BAC } from "./bac";
import { NAM } from "./nam";
import { QUANG_TRI_OVERRIDES } from "./quang-tri";
import { TRUNG } from "./trung";

export { BAC } from "./bac";
export { TRUNG } from "./trung";
export { NAM } from "./nam";

/** Provincial sub-variant: inherits every TRUNG entry, overrides a few (XH-003 §3). */
export function withProvince(
  base: RegionProfile,
  provinceCode: string,
  overrides: Record<string, DictAddressEntry>,
): RegionProfile {
  return {
    ...base,
    code: `${base.code}:${provinceCode}`,
    entries: { ...base.entries, ...overrides },
  };
}

export const TRUNG_QUANG_TRI = withProvince(TRUNG, "QUANG_TRI", QUANG_TRI_OVERRIDES);

export const REGION_PROFILES: Record<string, RegionProfile> = {
  BAC,
  TRUNG,
  NAM,
  [TRUNG_QUANG_TRI.code]: TRUNG_QUANG_TRI,
};

function stripSeniorityMarkers(signature: string): string {
  return signature.replace(/[ey]/g, "");
}

const REGISTERS: readonly Register[] = ["spoken", "formal", "reference"];

/** Resolves every register's selfRef against ego's own gender; `undefined`
 * means at least one register genuinely needs a gender we don't have. */
function resolveEntry(entry: DictAddressEntry, egoGender: KinshipGender): AddressEntry | undefined {
  const resolved = {} as Record<Register, AddressPair>;
  for (const register of REGISTERS) {
    const { call, selfRef } = entry[register];
    if (typeof selfRef === "string") {
      resolved[register] = { call, selfRef };
      continue;
    }
    if (egoGender !== "MALE" && egoGender !== "FEMALE") return undefined;
    const gendered = selfRef[egoGender];
    if (gendered === undefined) return undefined;
    resolved[register] = { call, selfRef: gendered };
  }
  return resolved as AddressEntry;
}

/**
 * XH-003 — looks up a resolved path signature in a branch profile's
 * dictionary. Falls back to the seniority-stripped key when the term doesn't
 * depend on age (e.g. "MeB" -> "MB"), reports UNKNOWN_SENIORITY rather than
 * guessing when it does (e.g. "FB" with no known elder/younger marker), and
 * reports UNKNOWN_GENDER when a matched entry's selfRef depends on ego's own
 * gender (e.g. "S") and ego's gender isn't recorded as MALE or FEMALE.
 */
export function resolveAddress(
  profile: RegionProfile,
  path: PathResult,
  egoGender: KinshipGender,
): AddressResolution {
  if (path.signature === "SELF") return { status: "SELF", signature: "SELF" };
  if (path.distant) return { status: "DISTANT", signature: "DISTANT" };

  const exact = profile.entries[path.signature];
  if (exact) {
    const resolved = resolveEntry(exact, egoGender);
    if (!resolved) return { status: "UNKNOWN_GENDER", signature: path.signature };
    return { status: "OK", signature: path.signature, entry: resolved };
  }

  const bare = stripSeniorityMarkers(path.signature);
  if (bare !== path.signature) {
    const fallback = profile.entries[bare];
    if (fallback) {
      const resolved = resolveEntry(fallback, egoGender);
      if (!resolved) return { status: "UNKNOWN_GENDER", signature: bare };
      return { status: "OK", signature: bare, entry: resolved };
    }
  }

  const hasSeniorityVariant = Object.keys(profile.entries).some(
    (key) => key !== bare && stripSeniorityMarkers(key) === bare,
  );
  if (hasSeniorityVariant) {
    return { status: "UNKNOWN_SENIORITY", signature: bare };
  }

  return { status: "NOT_FOUND", signature: path.signature };
}

const ORDINAL_WORDS: Record<number, string> = {
  2: "Hai",
  3: "Ba",
  4: "Tư",
  5: "Năm",
  6: "Sáu",
  7: "Bảy",
  8: "Tám",
  9: "Chín",
  10: "Mười",
};

/** XH-003 — sibling ordinal label, applying the profile's birth-order offset
 * (e.g. NAM's offset turns rank 1 into "Hai" instead of "Cả"). */
export function birthOrderLabel(rank: number, profile: RegionProfile): string {
  const index = rank + profile.birthOrderOffset;
  if (index === 1) return "Cả";
  return ORDINAL_WORDS[index] ?? String(index);
}
