/**
 * Runs the migration list against a real SQLite engine.
 *
 * The other schema test drives applyMigrations through a recording executor,
 * which proves the order statements are issued in but never that SQLite accepts
 * them. Since migrations are the one code path that touches a family's existing
 * file, they are also exercised here on node:sqlite.
 */
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import {
  applyMigrations,
  LATEST_SCHEMA_VERSION,
  type MigrationExecutor,
} from "./schema";

function executorFor(database: DatabaseSync): MigrationExecutor {
  return {
    getUserVersion() {
      const row = database.prepare("PRAGMA user_version").get() as {
        user_version: number;
      };
      return row.user_version;
    },
    exec(sql: string) {
      database.exec(sql);
    },
    setUserVersion(version: number) {
      database.exec(`PRAGMA user_version = ${version}`);
    },
    now() {
      return "2026-08-22T00:00:00.000Z";
    },
  };
}

function tableNames(database: DatabaseSync): string[] {
  return (
    database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[]
  ).map((row) => row.name);
}

function columnNames(database: DatabaseSync, table: string): string[] {
  return (
    database.prepare(`SELECT name FROM pragma_table_xinfo('${table}')`).all() as {
      name: string;
    }[]
  ).map((row) => row.name);
}

describe("applying every migration to a real database", () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = new DatabaseSync(":memory:");
  });

  it("reaches the latest version from an empty file", () => {
    const executor = executorFor(database);
    applyMigrations(executor);

    expect(executor.getUserVersion()).toBe(LATEST_SCHEMA_VERSION);
    expect(tableNames(database)).toContain("partial_dates");
    expect(tableNames(database)).toContain("family_unions");
    expect(tableNames(database)).toContain("branch_profiles");
  });

  it("is idempotent, so reopening a migrated file changes nothing", () => {
    applyMigrations(executorFor(database));
    const before = tableNames(database);

    applyMigrations(executorFor(database));

    expect(executorFor(database).getUserVersion()).toBe(LATEST_SCHEMA_VERSION);
    expect(tableNames(database)).toEqual(before);
  });

  it("keeps rows a family already entered on the sql.js schema", () => {
    // The shape the sql.js build created: same columns, no constraints, and
    // user_version left at 0.
    database.exec(`
      CREATE TABLE persons (
        id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT,
        middle_name TEXT, title_prefix TEXT, gender TEXT DEFAULT 'MALE',
        is_living INTEGER DEFAULT 1, birth_year INTEGER, birth_month INTEGER,
        birth_day INTEGER, death_year INTEGER, death_month INTEGER,
        death_day INTEGER, death_lunar TEXT, burial_location TEXT,
        phone_number TEXT, contact_address TEXT, zalo_link TEXT, fb_link TEXT,
        avatar_url TEXT, biography TEXT, notes TEXT, is_anchor INTEGER DEFAULT 0
      );
      CREATE TABLE relationships (
        id TEXT PRIMARY KEY, person_id TEXT NOT NULL, related_to_id TEXT NOT NULL,
        rel_type TEXT NOT NULL, is_primary INTEGER DEFAULT 0
      );
      INSERT INTO persons (id, first_name, last_name) VALUES ('p1', 'Long', 'Nguyễn');
      INSERT INTO relationships (id, person_id, related_to_id, rel_type)
        VALUES ('r1', 'p1', 'p1', 'SPOUSE');
    `);

    applyMigrations(executorFor(database));

    const person = database.prepare("SELECT first_name, last_name FROM persons WHERE id = 'p1'").get();
    expect(person).toEqual({ first_name: "Long", last_name: "Nguyễn" });
    expect(database.prepare("SELECT COUNT(*) c FROM relationships").get()).toEqual({ c: 1 });
    expect(executorFor(database).getUserVersion()).toBe(LATEST_SCHEMA_VERSION);
  });
});

describe("recording a lunar leap month", () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    applyMigrations(executorFor(database));
  });

  function insertDate(values: Record<string, string | number | null>): void {
    const columns = Object.keys(values);
    const placeholders = columns.map(() => "?").join(", ");
    database
      .prepare(`INSERT INTO partial_dates (${columns.join(", ")}) VALUES (${placeholders})`)
      .run(...Object.values(values));
  }

  it("adds the column without a table rebuild, so date references survive", () => {
    expect(columnNames(database, "partial_dates")).toContain("is_leap_month");
    // A rebuild would have dropped partial_dates and, through ON DELETE SET
    // NULL, blanked these columns.
    expect(columnNames(database, "family_unions")).toContain("started_date_id");
  });

  it("defaults to 0 so every date already in the file stays valid", () => {
    insertDate({ id: "d1", calendar: "GREGORIAN", precision: "DAY", year: 1980, month: 5, day: 4 });

    expect(database.prepare("SELECT is_leap_month FROM partial_dates WHERE id='d1'").get()).toEqual({
      is_leap_month: 0,
    });
  });

  it("stores a giỗ in a lunar leap month", () => {
    insertDate({
      id: "d2",
      calendar: "LUNAR",
      precision: "DAY",
      year: 2025,
      month: 6,
      day: 15,
      is_leap_month: 1,
    });

    expect(database.prepare("SELECT month, is_leap_month FROM partial_dates WHERE id='d2'").get()).toEqual({
      month: 6,
      is_leap_month: 1,
    });
  });

  it("records a giỗ that has only a month and day, as families usually know it", () => {
    // No year: source_text carries what the family said, which also satisfies
    // the constraint that a non-TEXT date needs a year or its source wording.
    insertDate({
      id: "d3",
      calendar: "LUNAR",
      precision: "MONTH",
      month: 8,
      day: 20,
      source_text: "giỗ 20 tháng 8 âm",
      is_leap_month: 0,
    });

    expect(database.prepare("SELECT month, day FROM partial_dates WHERE id='d3'").get()).toEqual({
      month: 8,
      day: 20,
    });
  });

  it("refuses a leap month on a Gregorian date", () => {
    expect(() =>
      insertDate({ id: "bad", calendar: "GREGORIAN", precision: "DAY", year: 2025, month: 6, is_leap_month: 1 }),
    ).toThrow(/leap month belongs to a lunar date/);
  });

  it("refuses a lunar day past 30, which no lunar month has", () => {
    expect(() =>
      insertDate({ id: "bad", calendar: "LUNAR", precision: "DAY", year: 2025, month: 6, day: 31 }),
    ).toThrow(/at most 30 days/);
  });

  it("refuses a flag that is neither 0 nor 1", () => {
    expect(() =>
      insertDate({ id: "bad", calendar: "LUNAR", precision: "DAY", year: 2025, month: 6, is_leap_month: 2 }),
    ).toThrow(/leap month belongs to a lunar date/);
  });

  it("enforces the same rules on update, not only insert", () => {
    insertDate({ id: "d4", calendar: "GREGORIAN", precision: "DAY", year: 1990, month: 3, day: 2 });

    expect(() =>
      database.prepare("UPDATE partial_dates SET is_leap_month = 1 WHERE id = 'd4'").run(),
    ).toThrow(/leap month belongs to a lunar date/);
  });
});
