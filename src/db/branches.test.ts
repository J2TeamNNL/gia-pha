import { describe, expect, it, vi } from "vitest";
import type { DatabaseClient, QueryResult, SqlValue } from "./client";

type Row = SqlValue[];

/**
 * A minimal in-memory stand-in for the three tables recomputeDerivedMembership
 * touches. It pattern-matches on table names rather than parsing SQL, which is
 * fine because branches.ts only ever issues the fixed queries exercised here.
 */
function createFakeDb(seed: { relationships?: Row[]; branchRoots?: Row[] } = {}) {
  const relationships: Row[] = seed.relationships ?? [];
  const branchRoots: Row[] = seed.branchRoots ?? [];
  const personBranchLinks: Row[] = [];

  const db: DatabaseClient = {
    async exec(sql: string, params: SqlValue[] = []): Promise<QueryResult[]> {
      if (sql.includes("FROM branch_roots")) {
        const [branchProfileId] = params;
        return [
          {
            columns: ["root_person_id"],
            values: branchRoots
              .filter((row) => row[0] === branchProfileId)
              .map((row) => [row[1]]),
          },
        ];
      }
      if (sql.includes("FROM relationships")) {
        return [{ columns: ["person_id", "related_to_id", "rel_type"], values: relationships }];
      }
      if (sql.includes("FROM person_branch_links")) {
        const [filterValue] = params;
        const filterColumn = sql.includes("WHERE person_id") ? 1 : 2;
        return [
          {
            columns: ["id", "person_id", "branch_profile_id", "source"],
            values: personBranchLinks.filter((row) => row[filterColumn] === filterValue),
          },
        ];
      }
      throw new Error(`Unexpected exec: ${sql}`);
    },
    async run(sql: string, params: SqlValue[] = []): Promise<void> {
      if (sql.startsWith("DELETE FROM person_branch_links") && sql.includes("source = 'DERIVED'")) {
        const [branchProfileId] = params;
        for (let i = personBranchLinks.length - 1; i >= 0; i--) {
          if (personBranchLinks[i][2] === branchProfileId && personBranchLinks[i][3] === "DERIVED") {
            personBranchLinks.splice(i, 1);
          }
        }
        return;
      }
      if (sql.startsWith("INSERT OR IGNORE INTO person_branch_links") && sql.includes("'DERIVED'")) {
        const [id, personId, branchProfileId] = params;
        personBranchLinks.push([id, personId, branchProfileId, "DERIVED"]);
        return;
      }
      if (sql.startsWith("INSERT OR IGNORE INTO person_branch_links") && sql.includes("'MANUAL'")) {
        const [id, personId, branchProfileId] = params;
        personBranchLinks.push([id, personId, branchProfileId, "MANUAL"]);
        return;
      }
      throw new Error(`Unexpected run: ${sql}`);
    },
    batch: vi.fn(),
    close: vi.fn(),
    listTrees: vi.fn(),
    createTree: vi.fn(),
    renameTree: vi.fn(),
    openTree: vi.fn(),
    deleteTree: vi.fn(),
    getActiveTree: vi.fn(),
  };

  return { db, personBranchLinks };
}

vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client");
  return { ...actual, getDb: vi.fn() };
});

async function useFakeDb(seed?: { relationships?: Row[]; branchRoots?: Row[] }) {
  const { getDb } = await import("./client");
  const fake = createFakeDb(seed);
  vi.mocked(getDb).mockResolvedValue(fake.db);
  return fake;
}

describe("recomputeDerivedMembership", () => {
  it("populates DERIVED rows from descendants and married-in partners", async () => {
    const { recomputeDerivedMembership, listPersonBranchLinks } = await import("./branches");
    const { personBranchLinks } = await useFakeDb({
      branchRoots: [["branch-1", "root"]],
      relationships: [
        ["root", "child", "PARENT_OF"],
        ["child", "spouse", "SPOUSE"],
      ],
    });

    await recomputeDerivedMembership("branch-1");
    const links = await listPersonBranchLinks("branch-1");

    const personIds = links.map((link) => link.person_id).sort();
    expect(personIds).toEqual(["child", "root", "spouse"]);
    expect(links.every((link) => link.source === "DERIVED")).toBe(true);
    void personBranchLinks;
  });

  it("never overwrites or deletes MANUAL rows when recomputing", async () => {
    const { recomputeDerivedMembership, setManualBranchLink, listPersonBranchLinks } = await import(
      "./branches"
    );
    await useFakeDb({
      branchRoots: [["branch-1", "root"]],
      relationships: [["root", "child", "PARENT_OF"]],
    });

    await setManualBranchLink("family-friend", "branch-1");
    await recomputeDerivedMembership("branch-1");
    await recomputeDerivedMembership("branch-1");

    const links = await listPersonBranchLinks("branch-1");
    const manualLinks = links.filter((link) => link.source === "MANUAL");
    const derivedLinks = links.filter((link) => link.source === "DERIVED");

    expect(manualLinks.map((link) => link.person_id)).toEqual(["family-friend"]);
    expect(derivedLinks.map((link) => link.person_id).sort()).toEqual(["child", "root"]);
  });

  it("lets the same person hold DERIVED membership in two different branches", async () => {
    const { recomputeDerivedMembership, listBranchesForPerson } = await import("./branches");
    await useFakeDb({
      branchRoots: [
        ["paternal", "founder"],
        ["maternal", "spouse"],
      ],
      relationships: [["founder", "spouse", "SPOUSE"]],
    });

    await recomputeDerivedMembership("paternal");
    await recomputeDerivedMembership("maternal");

    const spouseBranches = await listBranchesForPerson("spouse");
    const branchIds = spouseBranches.map((link) => link.branch_profile_id).sort();

    expect(branchIds).toEqual(["maternal", "paternal"]);
  });
});
