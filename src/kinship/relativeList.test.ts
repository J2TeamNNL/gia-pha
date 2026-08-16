import { describe, expect, it } from "vitest";
import { buildRelativeRows, generationOf, sortRelativeRows } from "./relativeList";
import type { AddressContext, BranchDialect } from "./branchContext";
import type { KinshipPerson, KinshipRelationship } from "./types";

const PATERNAL: BranchDialect = {
  id: "paternal",
  name: "Họ nội",
  regionCode: "TRUNG",
};
const MATERNAL: BranchDialect = {
  id: "maternal",
  name: "Họ ngoại",
  regionCode: "BAC",
};

function context(
  persons: KinshipPerson[],
  relationships: KinshipRelationship[],
  membership: Record<string, string[]>,
): AddressContext {
  return {
    persons,
    relationships,
    branchesByPerson: new Map(Object.entries(membership)),
    branchesById: new Map([PATERNAL, MATERNAL].map((b) => [b.id, b])),
    fallbackRegion: "BAC",
  };
}

const male = (id: string, year?: number): KinshipPerson => ({
  id,
  gender: "MALE",
  birth_year: year ?? null,
});

describe("generationOf", () => {
  it("climbs on parent hops and descends on child hops", () => {
    expect(generationOf("F")).toBe(1);
    expect(generationOf("FF")).toBe(2);
    expect(generationOf("S")).toBe(-1);
    expect(generationOf("FeB")).toBe(1);
  });

  it("stays level for siblings and partners", () => {
    expect(generationOf("eB")).toBe(0);
    expect(generationOf("W")).toBe(0);
  });

  it("treats SELF and DISTANT as level", () => {
    expect(generationOf("SELF")).toBe(0);
    expect(generationOf("DISTANT")).toBe(0);
  });
});

describe("buildRelativeRows", () => {
  it("skips the reference person and rows every other relative", () => {
    const rows = buildRelativeRows(
      "ego",
      context(
        [male("ego", 1990), male("dad", 1960)],
        [{ person_id: "dad", related_to_id: "ego", rel_type: "PARENT_OF" }],
        { ego: ["paternal"], dad: ["paternal"] },
      ),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      personId: "dad",
      branchName: "Họ nội",
      generation: 1,
      status: "OK",
    });
  });

  it("emits one row per branch for a person in two", () => {
    const rows = buildRelativeRows(
      "ego",
      context(
        [male("ego", 1990), male("dad", 1960)],
        [{ person_id: "dad", related_to_id: "ego", rel_type: "PARENT_OF" }],
        { ego: ["paternal", "maternal"], dad: ["paternal", "maternal"] },
      ),
    );

    expect(rows.map((row) => row.branchId).sort()).toEqual([
      "maternal",
      "paternal",
    ]);
  });

  it("carries an unresolved status through instead of dropping the person", () => {
    const rows = buildRelativeRows(
      "ego",
      context(
        [male("ego", 1990), { id: "stranger", gender: "UNKNOWN" }],
        [],
        {},
      ),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].call).toBeNull();
  });
});

describe("sortRelativeRows", () => {
  const rows = [
    { personId: "child", branchId: "a", branchName: "Họ nội", generation: -1, status: "OK" as const, call: "con", selfRef: "bố", signature: "S" },
    { personId: "uncle", branchId: "a", branchName: "Họ nội", generation: 1, status: "OK" as const, call: "bác", selfRef: "cháu", signature: "FeB" },
    { personId: "cousin", branchId: "b", branchName: "Họ ngoại", generation: 0, status: "OK" as const, call: "anh", selfRef: "em", signature: "MBS" },
  ];
  const nameOf = (id: string) => id;
  const birthYearOf = () => null;

  it("groups by branch then puts elders first", () => {
    const sorted = sortRelativeRows({ rows, nameOf, birthYearOf, key: "kinship" });
    expect(sorted.map((row) => row.personId)).toEqual([
      "cousin",
      "uncle",
      "child",
    ]);
  });

  it("sorts by name when asked", () => {
    const sorted = sortRelativeRows({ rows, nameOf, birthYearOf, key: "name" });
    expect(sorted.map((row) => row.personId)).toEqual([
      "child",
      "cousin",
      "uncle",
    ]);
  });

  it("puts the older person first within one rank", () => {
    const sameRank = [
      { ...rows[1], personId: "younger" },
      { ...rows[1], personId: "older" },
    ];
    const years: Record<string, number> = { younger: 1970, older: 1950 };
    const sorted = sortRelativeRows({
      rows: sameRank,
      nameOf,
      birthYearOf: (id) => years[id] ?? null,
      key: "kinship",
    });
    expect(sorted[0].personId).toBe("older");
  });
});
