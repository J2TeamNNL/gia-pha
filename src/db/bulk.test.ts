import { describe, expect, it, vi } from "vitest";
import type {
  BatchStatement,
  DatabaseClient,
  QueryResult,
  SqlValue,
} from "./client";
import type { BulkPerson } from "./bulk";

type Row = SqlValue[];

const PERSON_COLUMNS = ["id", "first_name", "gender", "is_living"];
const RELATIONSHIP_COLUMNS = [
  "id",
  "person_id",
  "related_to_id",
  "rel_type",
  "is_primary",
];

function createFakeDb(
  seed: { persons?: Row[]; relationships?: Row[] } = {},
): { db: DatabaseClient; committed: BatchStatement[] } {
  const committed: BatchStatement[] = [];
  const db: DatabaseClient = {
    async exec(sql: string): Promise<QueryResult[]> {
      if (sql.includes("FROM persons")) {
        return [{ columns: PERSON_COLUMNS, values: seed.persons ?? [] }];
      }
      if (sql.includes("FROM relationships")) {
        return [
          { columns: RELATIONSHIP_COLUMNS, values: seed.relationships ?? [] },
        ];
      }
      throw new Error(`Unexpected exec: ${sql}`);
    },
    async batch(statements: BatchStatement[]): Promise<void> {
      committed.push(...statements);
    },
    run: vi.fn(),
    close: vi.fn(),
    listTrees: vi.fn(),
    createTree: vi.fn(),
    renameTree: vi.fn(),
    openTree: vi.fn(),
    deleteTree: vi.fn(),
    getActiveTree: vi.fn(),
  };
  return { db, committed };
}

vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client");
  return { ...actual, getDb: vi.fn() };
});

async function useFakeDb(seed?: { persons?: Row[]; relationships?: Row[] }) {
  const { getDb } = await import("./client");
  const fake = createFakeDb(seed);
  vi.mocked(getDb).mockResolvedValue(fake.db);
  return fake;
}

function person(externalId: string, firstName: string): BulkPerson {
  return { externalId, first_name: firstName, gender: "MALE", is_living: true };
}

describe("bulkImport", () => {
  it("mints ids and resolves relationships through externalId", async () => {
    const { bulkImport } = await import("./bulk");
    await useFakeDb();

    const result = await bulkImport({
      persons: [person("p1", "Ông"), person("p2", "Cha")],
      relationships: [
        {
          person_external_id: "p1",
          related_to_external_id: "p2",
          rel_type: "PARENT_OF",
        },
      ],
    });

    expect(result.persons).toHaveLength(2);
    expect(result.relationships[0].person_id).toBe(result.idByExternalId.p1);
    expect(result.relationships[0].related_to_id).toBe(result.idByExternalId.p2);
  });

  it("commits every row in a single batch", async () => {
    const { bulkImport } = await import("./bulk");
    const { committed } = await useFakeDb();

    await bulkImport({
      persons: [person("p1", "Ông"), person("p2", "Cha")],
      relationships: [
        {
          person_external_id: "p1",
          related_to_external_id: "p2",
          rel_type: "PARENT_OF",
        },
      ],
    });

    expect(committed).toHaveLength(3);
    expect(
      committed.filter((statement) => statement.sql.includes("INTO persons")),
    ).toHaveLength(2);
  });

  it("attaches to a person already stored when the id is not in the batch", async () => {
    const { bulkImport } = await import("./bulk");
    await useFakeDb({ persons: [["existing", "Ông", "MALE", 1]] });

    const result = await bulkImport({
      persons: [person("p1", "Cháu")],
      relationships: [
        {
          person_external_id: "existing",
          related_to_external_id: "p1",
          rel_type: "PARENT_OF",
        },
      ],
    });

    expect(result.relationships[0].person_id).toBe("existing");
  });

  it("rejects the batch and reports the offending row index", async () => {
    const { bulkImport, BulkImportError } = await import("./bulk");
    const { committed } = await useFakeDb();

    const failing = bulkImport({
      persons: [person("p1", "Ông"), person("p2", "Cha")],
      relationships: [
        {
          person_external_id: "p1",
          related_to_external_id: "p2",
          rel_type: "PARENT_OF",
        },
        {
          person_external_id: "p2",
          related_to_external_id: "p1",
          rel_type: "PARENT_OF",
        },
      ],
    });

    await expect(failing).rejects.toBeInstanceOf(BulkImportError);
    await expect(failing).rejects.toMatchObject({ relationshipIndex: 1 });
    expect(committed).toHaveLength(0);
  });

  it("rejects a relationship pointing at an unknown person", async () => {
    const { bulkImport } = await import("./bulk");
    await useFakeDb();

    await expect(
      bulkImport({
        persons: [person("p1", "Ông")],
        relationships: [
          {
            person_external_id: "p1",
            related_to_external_id: "ghost",
            rel_type: "PARENT_OF",
          },
        ],
      }),
    ).rejects.toMatchObject({ relationshipIndex: 0 });
  });
});
