export const LATEST_SCHEMA_VERSION = 3;

/** First schema version that has the tree_metadata table to keep in sync. */
const TREE_METADATA_SINCE_VERSION = 2;

export interface SchemaMigration {
  version: number;
  description: string;
  sql: string;
}

/**
 * Version 1 is deliberately additive: it recognizes the prototype tables
 * without dropping or rewriting their rows.
 */
const INITIAL_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS persons (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT,
    middle_name TEXT,
    title_prefix TEXT,
    gender TEXT NOT NULL DEFAULT 'OTHER' CHECK (gender IN ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN')),
    is_living INTEGER NOT NULL DEFAULT 1 CHECK (is_living IN (0, 1)),
    birth_year INTEGER,
    birth_month INTEGER CHECK (birth_month BETWEEN 1 AND 12),
    birth_day INTEGER CHECK (birth_day BETWEEN 1 AND 31),
    death_year INTEGER,
    death_month INTEGER CHECK (death_month BETWEEN 1 AND 12),
    death_day INTEGER CHECK (death_day BETWEEN 1 AND 31),
    death_lunar TEXT,
    burial_location TEXT,
    phone_number TEXT,
    contact_address TEXT,
    zalo_link TEXT,
    fb_link TEXT,
    avatar_url TEXT,
    biography TEXT,
    notes TEXT,
    is_anchor INTEGER NOT NULL DEFAULT 0 CHECK (is_anchor IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS relationships (
    id TEXT PRIMARY KEY,
    person_id TEXT NOT NULL,
    related_to_id TEXT NOT NULL,
    rel_type TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
    FOREIGN KEY(person_id) REFERENCES persons(id) ON DELETE CASCADE,
    FOREIGN KEY(related_to_id) REFERENCES persons(id) ON DELETE CASCADE
  );
`;

const DOMAIN_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS tree_metadata (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    reference_person_id TEXT REFERENCES persons(id) ON DELETE SET NULL,
    source_name TEXT,
    source_url TEXT,
    source_hash TEXT
  );

  CREATE TABLE IF NOT EXISTS partial_dates (
    id TEXT PRIMARY KEY,
    calendar TEXT NOT NULL DEFAULT 'GREGORIAN' CHECK (calendar IN ('GREGORIAN', 'LUNAR', 'OTHER')),
    precision TEXT NOT NULL CHECK (precision IN ('YEAR', 'MONTH', 'DAY', 'APPROXIMATE', 'RANGE', 'TEXT')),
    year INTEGER,
    month INTEGER CHECK (month BETWEEN 1 AND 12),
    day INTEGER CHECK (day BETWEEN 1 AND 31),
    end_year INTEGER,
    end_month INTEGER CHECK (end_month BETWEEN 1 AND 12),
    end_day INTEGER CHECK (end_day BETWEEN 1 AND 31),
    source_text TEXT,
    qualifier TEXT,
    CHECK (
      (precision = 'TEXT' AND source_text IS NOT NULL)
      OR (precision <> 'TEXT' AND (year IS NOT NULL OR source_text IS NOT NULL))
    ),
    CHECK (end_year IS NULL OR year IS NULL OR end_year >= year)
  );

  CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    place_type TEXT,
    parent_place_id TEXT REFERENCES places(id) ON DELETE SET NULL,
    latitude REAL,
    longitude REAL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS family_unions (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (status IN ('UNKNOWN', 'MARRIED', 'DIVORCED', 'SEPARATED', 'PARTNERSHIP', 'OTHER')),
    started_date_id TEXT REFERENCES partial_dates(id) ON DELETE SET NULL,
    ended_date_id TEXT REFERENCES partial_dates(id) ON DELETE SET NULL,
    place_id TEXT REFERENCES places(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS family_partners (
    id TEXT PRIMARY KEY,
    family_union_id TEXT NOT NULL REFERENCES family_unions(id) ON DELETE CASCADE,
    person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
    role TEXT NOT NULL DEFAULT 'PARTNER' CHECK (role IN ('PARTNER', 'PARENT', 'OTHER')),
    position INTEGER,
    started_date_id TEXT REFERENCES partial_dates(id) ON DELETE SET NULL,
    ended_date_id TEXT REFERENCES partial_dates(id) ON DELETE SET NULL,
    UNIQUE (family_union_id, person_id),
    UNIQUE (family_union_id, position)
  );

  CREATE TABLE IF NOT EXISTS family_children (
    id TEXT PRIMARY KEY,
    family_union_id TEXT NOT NULL REFERENCES family_unions(id) ON DELETE CASCADE,
    child_person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
    parentage_type TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (parentage_type IN ('BIOLOGICAL', 'ADOPTED', 'STEP', 'FOSTER', 'UNKNOWN')),
    birth_order INTEGER CHECK (birth_order IS NULL OR birth_order >= 0),
    notes TEXT,
    UNIQUE (family_union_id, child_person_id)
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    person_id TEXT REFERENCES persons(id) ON DELETE CASCADE,
    family_union_id TEXT REFERENCES family_unions(id) ON DELETE CASCADE,
    date_id TEXT REFERENCES partial_dates(id) ON DELETE SET NULL,
    place_id TEXT REFERENCES places(id) ON DELETE SET NULL,
    description TEXT,
    privacy_level TEXT NOT NULL DEFAULT 'STANDARD' CHECK (privacy_level IN ('PUBLIC', 'STANDARD', 'PRIVATE')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (person_id IS NOT NULL OR family_union_id IS NOT NULL)
  );

  CREATE TABLE IF NOT EXISTS import_batches (
    id TEXT PRIMARY KEY,
    adapter_name TEXT NOT NULL,
    source_name TEXT,
    source_hash TEXT,
    imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    warnings_json TEXT
  );

  CREATE TABLE IF NOT EXISTS external_references (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    source_system TEXT NOT NULL,
    external_id TEXT NOT NULL,
    import_batch_id TEXT REFERENCES import_batches(id) ON DELETE SET NULL,
    source_hash TEXT,
    UNIQUE (entity_type, entity_id, source_system, external_id)
  );

  CREATE TABLE IF NOT EXISTS extension_payloads (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    namespace TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    import_batch_id TEXT REFERENCES import_batches(id) ON DELETE SET NULL,
    UNIQUE (entity_type, entity_id, namespace)
  );

  CREATE INDEX IF NOT EXISTS idx_family_partners_person ON family_partners(person_id);
  CREATE INDEX IF NOT EXISTS idx_family_children_person ON family_children(child_person_id);
  CREATE INDEX IF NOT EXISTS idx_events_person ON events(person_id);
  CREATE INDEX IF NOT EXISTS idx_events_union ON events(family_union_id);

  CREATE TRIGGER IF NOT EXISTS family_children_no_partner_self_link
  BEFORE INSERT ON family_children
  WHEN EXISTS (
    SELECT 1 FROM family_partners
    WHERE family_union_id = NEW.family_union_id AND person_id = NEW.child_person_id
  )
  BEGIN
    SELECT RAISE(ABORT, 'A person cannot be both a partner and child in one family union');
  END;
`;

const RELATIONSHIP_INDEXES_SQL = `
  CREATE INDEX IF NOT EXISTS idx_relationships_person ON relationships(person_id);
  CREATE INDEX IF NOT EXISTS idx_relationships_related_to ON relationships(related_to_id);
`;

export const SCHEMA_MIGRATIONS: readonly SchemaMigration[] = [
  { version: 1, description: "Preserve prototype people and relationships", sql: INITIAL_SCHEMA_SQL },
  { version: 2, description: "Add versioned genealogy domain tables", sql: DOMAIN_SCHEMA_SQL },
  { version: 3, description: "Index relationships by person for deletes and traversal", sql: RELATIONSHIP_INDEXES_SQL },
];

export function migrationsAfter(version: number): readonly SchemaMigration[] {
  if (!Number.isInteger(version) || version < 0 || version > LATEST_SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version: ${version}.`);
  }
  return SCHEMA_MIGRATIONS.filter((migration) => migration.version > version);
}

export interface MigrationExecutor {
  getUserVersion(): number;
  exec(sql: string): void;
  setUserVersion(version: number): void;
  now(): string;
}

/**
 * Applies each migration in its own immediate transaction. Failed statements
 * are rolled back, leaving the original database file and user_version intact.
 */
export function applyMigrations(executor: MigrationExecutor): void {
  // foreign_keys is a per-connection setting: it must be enabled on every
  // open, not only when migrations are pending.
  executor.exec("PRAGMA foreign_keys = ON");
  for (const migration of migrationsAfter(executor.getUserVersion())) {
    executor.exec("BEGIN IMMEDIATE");
    try {
      executor.exec(migration.sql);
      if (migration.version >= TREE_METADATA_SINCE_VERSION) {
        const timestamp = executor.now().replace(/'/g, "''");
        executor.exec(
          `INSERT INTO tree_metadata (singleton, schema_version, created_at, updated_at)
           VALUES (1, ${migration.version}, '${timestamp}', '${timestamp}')
           ON CONFLICT(singleton) DO UPDATE SET schema_version = excluded.schema_version, updated_at = excluded.updated_at`,
        );
      }
      executor.setUserVersion(migration.version);
      executor.exec("COMMIT");
    } catch (error) {
      try {
        executor.exec("ROLLBACK");
      } catch {
        // The original migration error is more actionable than a rollback error.
      }
      throw new Error(`Schema migration ${migration.version} failed: ${String(error)}`);
    }
  }
}

/** Backward-compatible entrypoint for callers that only create a fresh schema. */
export const initDatabaseSchema = (db: Pick<MigrationExecutor, "exec">) => {
  db.exec(INITIAL_SCHEMA_SQL);
  db.exec(DOMAIN_SCHEMA_SQL);
};

export function isSchemaValid(db: { exec(statement: string): { values: unknown[][] }[] }): boolean {
  try {
    const result = db.exec("PRAGMA table_info(persons)");
    const columns = result[0]?.values.map((row) => String(row[1])) ?? [];
    return ["id", "first_name", "gender", "is_living", "is_anchor"].every((column) =>
      columns.includes(column),
    );
  } catch {
    return false;
  }
}
