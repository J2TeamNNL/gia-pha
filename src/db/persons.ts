/**
 * Person DB operations
 * CRUD queries on the SQLite persons and relationships tables.
 */
import { v4 as uuidv4 } from "uuid";
import type { Person, Relationship, RelationshipType } from "./types";
import { getDb, saveDb } from "./client";

function rowToObject(columns: string[], values: (string | number | null)[]) {
  const obj: Record<string, string | number | null | boolean> = {};
  columns.forEach((col, i) => {
    // Convert SQLite integers 0/1 to booleans for boolean fields
    if (col === "is_living") {
      obj[col] = values[i] === 1 || values[i] === "1";
    } else {
      obj[col] = values[i];
    }
  });
  return obj;
}

export async function getAllPersons(): Promise<Person[]> {
  const db = await getDb();
  const result = db.exec(
    "SELECT * FROM persons ORDER BY last_name, first_name",
  );
  if (!result.length) return [];
  const { columns, values } = result[0];
  return (values as unknown as (string | number | null)[][]).map(
    (row) => rowToObject(columns, row) as unknown as Person,
  );
}

export async function createPerson(data: Omit<Person, "id">): Promise<Person> {
  const db = await getDb();
  const id = uuidv4();
  const person: Person = { id, ...data };

  db.run(
    `INSERT INTO persons (id, first_name, last_name, middle_name, title_prefix, gender, is_living,
      birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar, burial_location,
      phone_number, contact_address, zalo_link, fb_link, avatar_url, biography, notes, is_anchor)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      person.id,
      person.first_name,
      person.last_name ?? null,
      person.middle_name ?? null,
      person.title_prefix ?? null,
      person.gender,
      person.is_living ? 1 : 0,
      person.birth_year ?? null,
      person.birth_month ?? null,
      person.birth_day ?? null,
      person.death_year ?? null,
      person.death_month ?? null,
      person.death_day ?? null,
      person.death_lunar ?? null,
      person.burial_location ?? null,
      person.phone_number ?? null,
      person.contact_address ?? null,
      person.zalo_link ?? null,
      person.fb_link ?? null,
      person.avatar_url ?? null,
      person.biography ?? null,
      person.notes ?? null,
      person.is_anchor ? 1 : 0,
    ],
  );
  await saveDb();
  return person;
}

export async function setAnchorPerson(id: string): Promise<void> {
  const db = await getDb();
  db.run("UPDATE persons SET is_anchor = 0");
  db.run("UPDATE persons SET is_anchor = 1 WHERE id = ?", [id]);
  await saveDb();
}

export async function updatePerson(
  id: string,
  data: Partial<Omit<Person, "id">>,
): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(data)
    .map((k) => `${k} = ?`)
    .join(", ");
  const values = [
    ...Object.values(data).map((v) =>
      typeof v === "boolean" ? (v ? 1 : 0) : (v ?? null),
    ),
    id,
  ];
  db.run(
    `UPDATE persons SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values,
  );
  await saveDb();
}

export async function deletePerson(id: string): Promise<void> {
  const db = await getDb();
  db.run("DELETE FROM relationships WHERE person_id = ? OR related_to_id = ?", [
    id,
    id,
  ]);
  db.run("DELETE FROM persons WHERE id = ?", [id]);
  await saveDb();
}

export async function createRelationship(
  personId: string,
  relatedToId: string,
  relType: RelationshipType,
  isPrimary = false,
): Promise<Relationship> {
  const db = await getDb();
  const rel: Relationship = {
    id: uuidv4(),
    person_id: personId,
    related_to_id: relatedToId,
    rel_type: relType,
    is_primary: isPrimary,
  };
  db.run(
    "INSERT INTO relationships (id, person_id, related_to_id, rel_type, is_primary) VALUES (?,?,?,?,?)",
    [
      rel.id,
      rel.person_id,
      rel.related_to_id,
      rel.rel_type,
      rel.is_primary ? 1 : 0,
    ],
  );
  await saveDb();
  return rel;
}

export async function getAllRelationships(): Promise<Relationship[]> {
  const db = await getDb();
  const result = db.exec("SELECT * FROM relationships");
  if (!result.length) return [];
  const { columns, values } = result[0];
  return (values as unknown as (string | number | null)[][]).map(
    (row) => rowToObject(columns, row) as unknown as Relationship,
  );
}
