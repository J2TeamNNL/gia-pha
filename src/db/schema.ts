/**
 * Creates the database schema.
 * Uses DROP + CREATE to guarantee a clean schema on every fresh DB.
 * (Migration of existing data is a future concern — for MVP we wipe and recreate.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const initDatabaseSchema = (db: any) => {
  db.run(`
    CREATE TABLE IF NOT EXISTS persons (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT,
      middle_name TEXT,
      title_prefix TEXT,
      gender TEXT DEFAULT 'MALE',
      is_living INTEGER DEFAULT 1,
      birth_year INTEGER,
      birth_month INTEGER,
      birth_day INTEGER,
      death_year INTEGER,
      death_month INTEGER,
      death_day INTEGER,
      death_lunar TEXT,
      burial_location TEXT,
      phone_number TEXT,
      contact_address TEXT,
      zalo_link TEXT,
      fb_link TEXT,
      avatar_url TEXT,
      biography TEXT,
      notes TEXT,
      is_anchor INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      related_to_id TEXT NOT NULL,
      rel_type TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      FOREIGN KEY(person_id) REFERENCES persons(id),
      FOREIGN KEY(related_to_id) REFERENCES persons(id)
    );
  `);
};

/**
 * Validates that the current schema is compatible.
 * Returns false if the schema is missing required columns (stale DB).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isSchemaValid(db: any): boolean {
  try {
    const result = db.exec("PRAGMA table_info(persons)");
    if (!result.length) return false;
    const columns = result[0].values.map((row: unknown[]) => row[1] as string);
    const required = ["id", "first_name", "gender", "is_living", "is_anchor"];
    return required.every((col) => columns.includes(col));
  } catch {
    return false;
  }
}
