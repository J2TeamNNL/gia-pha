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
