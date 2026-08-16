/** One letter per hop, per the notation in .docs/v0.2/context.md#Xưng hô. */
export type HopKind = "F" | "M" | "S" | "D" | "B" | "Z" | "H" | "W";

export type Seniority = "ELDER" | "YOUNGER" | "UNKNOWN";

/** Superset of `db/types.ts`'s `Gender` (which lacks "UNKNOWN" even though the
 * schema's CHECK constraint allows it) — kept local since this module may
 * only import types from `db/types`, not re-export a corrected one. */
export type KinshipGender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";

/** The only genders a term can be gendered by without guessing. */
export type EgoGender = "MALE" | "FEMALE";

/** Minimal shape needed to compare two people's seniority; birth_order is
 * accepted for forward compatibility with the (currently dead) v2 schema. */
export interface SeniorityInput {
  birth_order?: number | null;
  birth_year?: number | null;
  birth_month?: number | null;
  birth_day?: number | null;
}

export interface KinshipPerson extends SeniorityInput {
  id: string;
  gender: KinshipGender;
}

export type KinshipRelationType =
  | "PARENT_OF"
  | "SPOUSE"
  | "EX_SPOUSE"
  | "ADOPTED_PARENT_OF";

export interface KinshipRelationship {
  person_id: string;
  related_to_id: string;
  rel_type: KinshipRelationType;
}

export interface PathHop {
  kind: HopKind;
  personId: string;
  /** Only present for derived sibling hops (B/Z). */
  seniority?: Seniority;
}

export interface PathResult {
  /** "SELF", "DISTANT", or the concatenated hop signature (e.g. "FeB"). */
  signature: string;
  hops: PathHop[];
  distant: boolean;
}

export type Register = "spoken" | "formal" | "reference";

/** A resolved term: both sides are plain text, ready to render. */
export interface AddressPair {
  call: string;
  selfRef: string;
}

export type AddressEntry = Record<Register, AddressPair>;

/** `selfRef` as authored in a dictionary: a plain string when it never
 * depends on ego's own gender, or a per-gender map when it does (e.g. a
 * parent addressing their own child: "bố" vs "mẹ"). */
export type DictSelfRef = string | Partial<Record<EgoGender, string>>;

export interface DictAddressPair {
  call: string;
  selfRef: DictSelfRef;
}

export type DictAddressEntry = Record<Register, DictAddressPair>;

export type RegionCode = "BAC" | "TRUNG" | "NAM";

export interface RegionProfile {
  code: string;
  region: RegionCode;
  /** Added to the raw birth-order rank before picking the ordinal word. */
  birthOrderOffset: number;
  entries: Record<string, DictAddressEntry>;
}

export type AddressStatus =
  | "SELF"
  | "DISTANT"
  | "OK"
  | "UNKNOWN_SENIORITY"
  | "UNKNOWN_GENDER"
  | "NOT_FOUND";

export interface AddressResolution {
  status: AddressStatus;
  signature: string;
  entry?: AddressEntry;
}
