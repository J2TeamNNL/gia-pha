/**
 * Creates the initial database schema if it doesn't exist
 * Supports advanced data modeling: First/Last/Middle names,
 * Complex Relationships, Google Maps location.
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
      is_living BOOLEAN DEFAULT 1,

      -- Birth Data (Int to support just year, or full date)
      birth_year INTEGER,
      birth_month INTEGER,
      birth_day INTEGER,

      -- Death Data
      death_year INTEGER,
      death_month INTEGER,
      death_day INTEGER,
      death_lunar TEXT,
      burial_location TEXT,

      -- Contact & Social
      phone_number TEXT,
      contact_address TEXT,
      zalo_link TEXT,
      fb_link TEXT,

      -- Meta
      avatar_url TEXT,
      biography TEXT,
      notes TEXT,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      related_to_id TEXT NOT NULL,
      rel_type TEXT NOT NULL, -- 'PARENT_OF', 'SPOUSE', 'EX_SPOUSE', 'ADOPTED_PARENT_OF'
      is_primary BOOLEAN DEFAULT 0,

      FOREIGN KEY(person_id) REFERENCES persons(id),
      FOREIGN KEY(related_to_id) REFERENCES persons(id)
    );
  `);
};
