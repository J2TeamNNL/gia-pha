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
  const rowObj = result[0] as any;
  const columns = rowObj.columns || rowObj.lc || [];
  const values = rowObj.values;
  return (values as unknown as (string | number | null)[][]).map(
    (row) => rowToObject(columns, row) as unknown as Person,
  );
}

function escapeSql(val: string | number | null | boolean | undefined): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "1" : "0";
  if (typeof val === "number") return val.toString();
  return `'${String(val).replace(/'/g, "''")}'`;
}

export async function createPerson(data: Omit<Person, "id">): Promise<Person> {
  const db = await getDb();
  const id = uuidv4();
  const person: Person = { id, ...data };

  const sql = `INSERT INTO persons (
       id, first_name, last_name, middle_name, title_prefix,
       gender, is_living,
       birth_year, birth_month, birth_day,
       death_year, death_month, death_day, death_lunar, burial_location,
       phone_number, contact_address, zalo_link, fb_link,
       avatar_url, biography, notes, is_anchor
     ) VALUES (
       ${escapeSql(person.id)}, ${escapeSql(person.first_name)}, ${escapeSql(person.last_name)},
       ${escapeSql(person.middle_name)}, ${escapeSql(person.title_prefix)},
       ${escapeSql(person.gender)}, ${escapeSql(person.is_living)},
       ${escapeSql(person.birth_year)}, ${escapeSql(person.birth_month)}, ${escapeSql(person.birth_day)},
       ${escapeSql(person.death_year)}, ${escapeSql(person.death_month)}, ${escapeSql(person.death_day)},
       ${escapeSql(person.death_lunar)}, ${escapeSql(person.burial_location)},
       ${escapeSql(person.phone_number)}, ${escapeSql(person.contact_address)},
       ${escapeSql(person.zalo_link)}, ${escapeSql(person.fb_link)},
       ${escapeSql(person.avatar_url)}, ${escapeSql(person.biography)},
       ${escapeSql(person.notes)}, ${escapeSql(person.is_anchor)}
     )`;

  try {
    db.run(sql);
    console.log("createPerson query SUCCESS");
    const check = db.exec("SELECT * FROM persons");
    console.log(
      "createPerson check SELECT returned length:",
      check.length > 0 ? check[0].values.length : 0,
    );
  } catch (err: any) {
    console.error("createPerson QUERY FAILED:", err.message);
    throw err;
  }
  await saveDb();
  return person;
}

export async function setAnchorPerson(id: string): Promise<void> {
  const db = await getDb();
  try {
    db.run("UPDATE persons SET is_anchor = 0");
    db.run(`UPDATE persons SET is_anchor = 1 WHERE id = ${escapeSql(id)}`);
    console.log("setAnchorPerson query SUCCESS");
  } catch (err: any) {
    console.error("setAnchorPerson QUERY FAILED:", err.message);
    throw err;
  }
  await saveDb();
}

export async function updatePerson(
  id: string,
  data: Partial<Omit<Person, "id">>,
): Promise<void> {
  const db = await getDb();
  const fieldsSql = Object.entries(data)
    .map(([k, v]) => `${k} = ${escapeSql(v)}`)
    .join(", ");

  db.run(
    `UPDATE persons SET ${fieldsSql}, updated_at = CURRENT_TIMESTAMP WHERE id = ${escapeSql(id)}`,
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
  const rowObj = result[0] as any;
  const columns = rowObj.columns || rowObj.lc || [];
  const values = rowObj.values;
  return (values as unknown as (string | number | null)[][]).map(
    (row) => rowToObject(columns, row) as unknown as Relationship,
  );
}
