export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface Person {
  id: string;
  first_name: string;
  last_name?: string;
  middle_name?: string;
  title_prefix?: string;
  gender: Gender;
  is_living: boolean;

  birth_year?: number;
  birth_month?: number;
  birth_day?: number;

  death_year?: number;
  death_month?: number;
  death_day?: number;
  death_lunar?: string;
  burial_location?: string;

  phone_number?: string;
  contact_address?: string;
  zalo_link?: string;
  fb_link?: string;

  avatar_url?: string;
  biography?: string;
  notes?: string;
  is_anchor?: boolean; // true = this person is the reference point for danh xưng
}

export type RelationshipType =
  | "PARENT_OF"
  | "SPOUSE"
  | "EX_SPOUSE"
  | "ADOPTED_PARENT_OF";

export interface Relationship {
  id: string;
  person_id: string;
  related_to_id: string;
  rel_type: RelationshipType;
  is_primary: boolean;
}

export type RegionCode = "BAC" | "TRUNG" | "NAM";

export interface BranchProfile {
  id: string;
  name: string;
  region_code: RegionCode;
  language_code: string;
  parent_profile_id?: string;
  notes?: string;
}

export interface BranchRoot {
  id: string;
  branch_profile_id: string;
  root_person_id: string;
}

export type BranchLinkSource = "DERIVED" | "MANUAL";

export interface PersonBranchLink {
  id: string;
  person_id: string;
  branch_profile_id: string;
  source: BranchLinkSource;
}
