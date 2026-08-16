import { v4 as uuidv4 } from "uuid";
import { getDb } from "./client";
import type { QueryResult, SqlValue } from "./client";
import { computeDerivedBranchMembers } from "./branchMembership";
import type { BranchProfile, BranchRoot, PersonBranchLink, RelationshipType } from "./types";

function values(result: QueryResult[]): SqlValue[][] {
  return result[0]?.values ?? [];
}

export async function createBranchProfile(
  input: Omit<BranchProfile, "id">,
): Promise<BranchProfile> {
  const db = await getDb();
  const profile: BranchProfile = { id: uuidv4(), ...input };
  await db.run(
    `INSERT INTO branch_profiles (id, name, region_code, language_code, parent_profile_id, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      profile.id,
      profile.name,
      profile.region_code,
      profile.language_code,
      profile.parent_profile_id ?? null,
      profile.notes ?? null,
    ],
  );
  return profile;
}

export async function updateBranchProfile(
  id: string,
  data: Partial<Omit<BranchProfile, "id">>,
): Promise<void> {
  const entries = Object.entries(data);
  if (!entries.length) return;
  const db = await getDb();
  const assignments = entries.map(([column]) => `${column} = ?`).join(", ");
  const params = entries.map(([, value]) => (value === undefined ? null : (value as SqlValue)));
  await db.run(
    `UPDATE branch_profiles SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [...params, id],
  );
}

export async function deleteBranchProfile(id: string): Promise<void> {
  const db = await getDb();
  await db.run("DELETE FROM branch_profiles WHERE id = ?", [id]);
}

export async function listBranchProfiles(): Promise<BranchProfile[]> {
  const db = await getDb();
  const result = await db.exec(
    "SELECT id, name, region_code, language_code, parent_profile_id, notes FROM branch_profiles ORDER BY name",
  );
  return values(result).map((row) => ({
    id: String(row[0]),
    name: String(row[1]),
    region_code: row[2] as BranchProfile["region_code"],
    language_code: String(row[3]),
    parent_profile_id: row[4] == null ? undefined : String(row[4]),
    notes: row[5] == null ? undefined : String(row[5]),
  }));
}

export async function addBranchRoot(
  branchProfileId: string,
  rootPersonId: string,
): Promise<BranchRoot> {
  const db = await getDb();
  const root: BranchRoot = {
    id: uuidv4(),
    branch_profile_id: branchProfileId,
    root_person_id: rootPersonId,
  };
  await db.run(
    "INSERT INTO branch_roots (id, branch_profile_id, root_person_id) VALUES (?, ?, ?)",
    [root.id, root.branch_profile_id, root.root_person_id],
  );
  return root;
}

export async function removeBranchRoot(id: string): Promise<void> {
  const db = await getDb();
  await db.run("DELETE FROM branch_roots WHERE id = ?", [id]);
}

export async function listBranchRoots(branchProfileId: string): Promise<BranchRoot[]> {
  const db = await getDb();
  const result = await db.exec(
    "SELECT id, branch_profile_id, root_person_id FROM branch_roots WHERE branch_profile_id = ?",
    [branchProfileId],
  );
  return values(result).map((row) => ({
    id: String(row[0]),
    branch_profile_id: String(row[1]),
    root_person_id: String(row[2]),
  }));
}

export async function setManualBranchLink(
  personId: string,
  branchProfileId: string,
): Promise<PersonBranchLink> {
  const db = await getDb();
  const link: PersonBranchLink = {
    id: uuidv4(),
    person_id: personId,
    branch_profile_id: branchProfileId,
    source: "MANUAL",
  };
  await db.run(
    `INSERT OR IGNORE INTO person_branch_links (id, person_id, branch_profile_id, source)
     VALUES (?, ?, ?, 'MANUAL')`,
    [link.id, link.person_id, link.branch_profile_id],
  );
  return link;
}

export async function removeManualBranchLink(
  personId: string,
  branchProfileId: string,
): Promise<void> {
  const db = await getDb();
  await db.run(
    "DELETE FROM person_branch_links WHERE person_id = ? AND branch_profile_id = ? AND source = 'MANUAL'",
    [personId, branchProfileId],
  );
}

export async function listPersonBranchLinks(branchProfileId: string): Promise<PersonBranchLink[]> {
  const db = await getDb();
  const result = await db.exec(
    "SELECT id, person_id, branch_profile_id, source FROM person_branch_links WHERE branch_profile_id = ?",
    [branchProfileId],
  );
  return values(result).map((row) => ({
    id: String(row[0]),
    person_id: String(row[1]),
    branch_profile_id: String(row[2]),
    source: row[3] as PersonBranchLink["source"],
  }));
}

export async function listBranchesForPerson(personId: string): Promise<PersonBranchLink[]> {
  const db = await getDb();
  const result = await db.exec(
    "SELECT id, person_id, branch_profile_id, source FROM person_branch_links WHERE person_id = ?",
    [personId],
  );
  return values(result).map((row) => ({
    id: String(row[0]),
    person_id: String(row[1]),
    branch_profile_id: String(row[2]),
    source: row[3] as PersonBranchLink["source"],
  }));
}

/**
 * Rebuilds only the DERIVED rows for one branch. MANUAL rows are a disjoint
 * set (they use their own `source` value in the unique key) and this
 * function never touches them.
 */
export async function recomputeDerivedMembership(branchProfileId: string): Promise<void> {
  const db = await getDb();
  const [rootsResult, relationshipsResult] = await Promise.all([
    db.exec("SELECT root_person_id FROM branch_roots WHERE branch_profile_id = ?", [branchProfileId]),
    db.exec("SELECT person_id, related_to_id, rel_type FROM relationships"),
  ]);
  const rootPersonIds = values(rootsResult).map((row) => String(row[0]));
  const relationships = values(relationshipsResult).map((row) => ({
    person_id: String(row[0]),
    related_to_id: String(row[1]),
    rel_type: row[2] as RelationshipType,
  }));

  const members = computeDerivedBranchMembers(rootPersonIds, relationships);

  await db.run(
    "DELETE FROM person_branch_links WHERE branch_profile_id = ? AND source = 'DERIVED'",
    [branchProfileId],
  );
  for (const personId of members) {
    await db.run(
      `INSERT OR IGNORE INTO person_branch_links (id, person_id, branch_profile_id, source)
       VALUES (?, ?, ?, 'DERIVED')`,
      [uuidv4(), personId, branchProfileId],
    );
  }
}
