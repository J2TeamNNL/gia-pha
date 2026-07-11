import { describe, expect, it } from "vitest";
import {
  applyMigrations,
  initDatabaseSchema,
  isSchemaValid,
  LATEST_SCHEMA_VERSION,
  migrationsAfter,
} from "./schema";

class SchemaDb {
  statements: string[] = [];
  columns: string[] = [];

  exec(statement: string): { values: unknown[][] }[] {
    this.statements.push(statement);
    if (statement !== "PRAGMA table_info(persons)" || !this.columns.length) {
      return [];
    }

    return [{ values: this.columns.map((column) => [0, column]) }];
  }
}

describe("database schema", () => {
  it("creates person and relationship tables", () => {
    const db = new SchemaDb();

    initDatabaseSchema(db);

    expect(db.statements).toHaveLength(2);
    expect(db.statements.join("\n")).toContain("CREATE TABLE IF NOT EXISTS persons");
    expect(db.statements.join("\n")).toContain(
      "CREATE TABLE IF NOT EXISTS relationships",
    );
  });

  it("recognizes schemas containing the required person columns", () => {
    const db = new SchemaDb();
    db.columns = ["id", "first_name", "gender", "is_living", "is_anchor"];

    expect(isSchemaValid(db)).toBe(true);
  });

  it("rejects missing or incomplete schemas", () => {
    expect(isSchemaValid(new SchemaDb())).toBe(false);

    const db = new SchemaDb();
    db.columns = ["id", "first_name", "gender", "is_living"];
    expect(isSchemaValid(db)).toBe(false);
  });

  it("plans each pending schema version in order", () => {
    expect(migrationsAfter(0).map((migration) => migration.version)).toEqual([
      1,
      2,
      3,
    ]);
    expect(migrationsAfter(LATEST_SCHEMA_VERSION)).toEqual([]);
    expect(() => migrationsAfter(99)).toThrow("Unsupported schema version");
  });

  it("rolls back a failed migration without advancing its version", () => {
    const statements: string[] = [];
    let version = 1;
    const failure = new Error("disk full");

    expect(() =>
      applyMigrations({
        getUserVersion: () => version,
        exec: (statement) => {
          statements.push(statement);
          if (statement.includes("CREATE TABLE IF NOT EXISTS tree_metadata")) {
            throw failure;
          }
        },
        setUserVersion: (nextVersion) => {
          version = nextVersion;
        },
        now: () => "2026-07-11T00:00:00.000Z",
      }),
    ).toThrow("Schema migration 2 failed");

    expect(version).toBe(1);
    expect(statements).toContain("ROLLBACK");
  });

  it("uses immediate transactions and records the final schema version", () => {
    const statements: string[] = [];
    let version = 0;

    applyMigrations({
      getUserVersion: () => version,
      exec: (statement) => statements.push(statement),
      setUserVersion: (nextVersion) => {
        version = nextVersion;
      },
      now: () => "2026-07-11T00:00:00.000Z",
    });

    expect(version).toBe(LATEST_SCHEMA_VERSION);
    expect(statements.filter((statement) => statement === "BEGIN IMMEDIATE")).toHaveLength(3);
    expect(statements.filter((statement) => statement === "COMMIT")).toHaveLength(3);
  });

  it("enables foreign key enforcement even when no migrations are pending", () => {
    const statements: string[] = [];

    applyMigrations({
      getUserVersion: () => LATEST_SCHEMA_VERSION,
      exec: (statement) => statements.push(statement),
      setUserVersion: () => {},
      now: () => "2026-07-11T00:00:00.000Z",
    });

    expect(statements).toEqual(["PRAGMA foreign_keys = ON"]);
  });
});
