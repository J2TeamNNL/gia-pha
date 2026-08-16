import { getDb } from "./client";
import type { QueryResult, SqlValue } from "./client";
import type { BranchProfile, PersonBranchLink } from "./types";

export interface BranchMembership {
  profiles: BranchProfile[];
  links: PersonBranchLink[];
}

function values(result: QueryResult[]): SqlValue[][] {
  return result[0]?.values ?? [];
}

/**
 * Loads every branch profile and membership row in two queries.
 * Resolving terms for a whole tree touches most people, so the per-person
 * lookups in `branches.ts` would be one worker roundtrip each.
 */
export async function loadBranchMembership(): Promise<BranchMembership> {
  const db = await getDb();
  const [profileRows, linkRows] = await Promise.all([
    db.exec(
      "SELECT id, name, region_code, province_code, language_code, parent_profile_id, notes FROM branch_profiles ORDER BY name",
    ),
    db.exec("SELECT id, person_id, branch_profile_id, source FROM person_branch_links"),
  ]);

  return {
    profiles: values(profileRows).map((row) => ({
      id: String(row[0]),
      name: String(row[1]),
      region_code: row[2] as BranchProfile["region_code"],
      province_code: row[3] == null ? undefined : String(row[3]),
      language_code: String(row[4]),
      parent_profile_id: row[5] == null ? undefined : String(row[5]),
      notes: row[6] == null ? undefined : String(row[6]),
    })),
    links: values(linkRows).map((row) => ({
      id: String(row[0]),
      person_id: String(row[1]),
      branch_profile_id: String(row[2]),
      source: row[3] as PersonBranchLink["source"],
    })),
  };
}
