/**
 * Person DB operations
 * CRUD queries on the SQLite persons and relationships tables.
 * OPFS writes complete inside the SQLite worker before each request resolves,
 * so mutations need no separate flush step.
 */
import { v4 as uuidv4 } from "uuid";
import type { Person, Relationship, RelationshipType } from "./types";
import { getDb } from "./client";
import type { QueryResult, SqlValue } from "./client";
import { validateRelationship } from "./validation";

function rowToObject(columns: string[], values: SqlValue[]) {
  const obj: Record<string, string | number | null | boolean> = {};
  columns.forEach((col, i) => {
    // Convert SQLite integers 0/1 to booleans for boolean fields
    if (col === "is_living" || col === "is_anchor" || col === "is_primary") {
      obj[col] = values[i] === 1 || values[i] === "1";
    } else {
      obj[col] = values[i] instanceof Uint8Array ? null : values[i];
    }
  });
  return obj;
}

function toSqlValue(
  val: string | number | null | boolean | undefined,
): SqlValue {
  if (val === undefined || val === null) return null;
  if (typeof val === "boolean") return val ? 1 : 0;
  return val;
}

export async function getAllPersons(): Promise<Person[]> {
  const db = await getDb();
  const result = await db.exec(
    "SELECT * FROM persons ORDER BY last_name, first_name",
  );
  if (!result.length) return [];
  const rowObj = result[0] as QueryResult;
  return rowObj.values.map(
    (row) => rowToObject(rowObj.columns, row) as unknown as Person,
  );
}

const PERSON_COLUMNS = [
  "id",
  "first_name",
  "last_name",
  "middle_name",
  "title_prefix",
  "gender",
  "is_living",
  "birth_year",
  "birth_month",
  "birth_day",
  "death_year",
  "death_month",
  "death_day",
  "death_lunar",
  "burial_location",
  "phone_number",
  "contact_address",
  "zalo_link",
  "fb_link",
  "avatar_url",
  "biography",
  "notes",
  "is_anchor",
] as const satisfies readonly (keyof Person)[];

export async function createPerson(data: Omit<Person, "id">): Promise<Person> {
  const db = await getDb();
  const id = uuidv4();
  const person: Person = { ...data, id, is_anchor: data.is_anchor ?? false };

  const placeholders = PERSON_COLUMNS.map(() => "?").join(", ");
  const params = PERSON_COLUMNS.map((column) => toSqlValue(person[column]));
  await db.run(
    `INSERT INTO persons (${PERSON_COLUMNS.join(", ")}) VALUES (${placeholders})`,
    params,
  );
  return person;
}

export async function setAnchorPerson(id: string): Promise<void> {
  const db = await getDb();
  await db.run("UPDATE persons SET is_anchor = 0 WHERE is_anchor = 1");
  await db.run("UPDATE persons SET is_anchor = 1 WHERE id = ?", [id]);
}

export async function updatePerson(
  id: string,
  data: Partial<Omit<Person, "id">>,
): Promise<void> {
  const entries = Object.entries(data);
  if (!entries.length) return;
  const db = await getDb();
  const assignments = entries.map(([column]) => `${column} = ?`).join(", ");
  const params = entries.map(([, value]) => toSqlValue(value));
  await db.run(
    `UPDATE persons SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [...params, id],
  );
}

export async function deletePerson(id: string): Promise<void> {
  const db = await getDb();
  await db.run(
    "DELETE FROM relationships WHERE person_id = ? OR related_to_id = ?",
    [id, id],
  );
  await db.run("DELETE FROM persons WHERE id = ?", [id]);
}

export async function createRelationship(
  personId: string,
  relatedToId: string,
  relType: RelationshipType,
  isPrimary = false,
): Promise<Relationship> {
  const db = await getDb();
  const [personResult, relationshipResult] = await Promise.all([
    db.exec("SELECT id FROM persons WHERE id IN (?, ?)", [personId, relatedToId]),
    db.exec(
      "SELECT person_id, related_to_id, rel_type FROM relationships",
    ),
  ]);
  const personIds = new Set(
    (personResult[0]?.values ?? []).map((row) => String(row[0])),
  );
  const existing = (relationshipResult[0]?.values ?? []).map((row) => ({
    person_id: String(row[0]),
    related_to_id: String(row[1]),
    rel_type: String(row[2]) as RelationshipType,
  }));
  validateRelationship(
    {
      person_id: personId,
      related_to_id: relatedToId,
      rel_type: relType,
    },
    personIds,
    existing,
  );
  const rel: Relationship = {
    id: uuidv4(),
    person_id: personId,
    related_to_id: relatedToId,
    rel_type: relType,
    is_primary: isPrimary,
  };
  await db.run(
    "INSERT INTO relationships (id, person_id, related_to_id, rel_type, is_primary) VALUES (?,?,?,?,?)",
    [
      rel.id,
      rel.person_id,
      rel.related_to_id,
      rel.rel_type,
      rel.is_primary ? 1 : 0,
    ],
  );
  return rel;
}

export async function getAllRelationships(): Promise<Relationship[]> {
  const db = await getDb();
  const result = await db.exec("SELECT * FROM relationships");
  if (!result.length) return [];
  const rowObj = result[0] as QueryResult;
  return rowObj.values.map(
    (row) => rowToObject(rowObj.columns, row) as unknown as Relationship,
  );
}
