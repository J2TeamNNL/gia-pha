import { describe, expect, it } from "vitest";
import {
  resolveBranchAddresses,
  type AddressContext,
  type BranchDialect,
} from "./branchContext";
import type { KinshipPerson, KinshipRelationship } from "./types";

const PATERNAL: BranchDialect = {
  id: "paternal",
  name: "Họ nội (Quảng Trị)",
  regionCode: "TRUNG",
  profileCode: "TRUNG:QUANG_TRI",
};
const MATERNAL: BranchDialect = {
  id: "maternal",
  name: "Họ ngoại (Hà Nội)",
  regionCode: "BAC",
};
const WIFE_SIDE: BranchDialect = {
  id: "wife",
  name: "Bên vợ (miền Nam)",
  regionCode: "NAM",
};

function context(
  persons: KinshipPerson[],
  relationships: KinshipRelationship[],
  membership: Record<string, string[]>,
  branches: BranchDialect[] = [PATERNAL, MATERNAL, WIFE_SIDE],
): AddressContext {
  return {
    persons,
    relationships,
    branchesByPerson: new Map(Object.entries(membership)),
    branchesById: new Map(branches.map((branch) => [branch.id, branch])),
    fallbackRegion: "BAC",
  };
}

function male(id: string, birthYear?: number): KinshipPerson {
  return { id, gender: "MALE", birth_year: birthYear ?? null };
}
function female(id: string, birthYear?: number): KinshipPerson {
  return { id, gender: "FEMALE", birth_year: birthYear ?? null };
}

describe("resolveBranchAddresses", () => {
  it("resolves a father through the branch the father belongs to", () => {
    const result = resolveBranchAddresses(
      "ego",
      "dad",
      context(
        [male("ego", 1990), male("dad", 1960)],
        [{ person_id: "dad", related_to_id: "ego", rel_type: "PARENT_OF" }],
        { ego: ["paternal"], dad: ["paternal"] },
      ),
    );

    expect(result).toHaveLength(1);
    expect(result[0].branch?.id).toBe("paternal");
    expect(result[0].resolution.status).toBe("OK");
    expect(result[0].viaPersonId).toBeUndefined();
  });

  it("returns one resolution per branch when a person belongs to two", () => {
    const result = resolveBranchAddresses(
      "ego",
      "dad",
      context(
        [male("ego", 1990), male("dad", 1960)],
        [{ person_id: "dad", related_to_id: "ego", rel_type: "PARENT_OF" }],
        { ego: ["paternal", "maternal"], dad: ["paternal", "maternal"] },
      ),
    );

    expect(result.map((entry) => entry.branch?.id).sort()).toEqual([
      "maternal",
      "paternal",
    ]);
  });

  it("speaks from the spouse's position for a branch ego does not belong to", () => {
    const result = resolveBranchAddresses(
      "ego",
      "father-in-law",
      context(
        [male("ego", 1990), female("wife", 1992), male("father-in-law", 1960)],
        [
          { person_id: "ego", related_to_id: "wife", rel_type: "SPOUSE" },
          {
            person_id: "father-in-law",
            related_to_id: "wife",
            rel_type: "PARENT_OF",
          },
        ],
        { ego: ["paternal"], wife: ["wife"], "father-in-law": ["wife"] },
      ),
    );

    expect(result).toHaveLength(1);
    expect(result[0].branch?.id).toBe("wife");
    expect(result[0].viaPersonId).toBe("wife");
  });

  it("falls back to the chosen default region when a person has no branch", () => {
    const result = resolveBranchAddresses(
      "ego",
      "dad",
      context(
        [male("ego", 1990), male("dad", 1960)],
        [{ person_id: "dad", related_to_id: "ego", rel_type: "PARENT_OF" }],
        {},
      ),
    );

    expect(result).toHaveLength(1);
    expect(result[0].branch).toBeNull();
    expect(result[0].resolution.status).toBe("OK");
  });

  it("renders one father as bố in the north and ba in the south", () => {
    const persons = [male("ego", 1990), male("dad", 1960)];
    const relationships: KinshipRelationship[] = [
      { person_id: "dad", related_to_id: "ego", rel_type: "PARENT_OF" },
    ];
    const membership = { ego: ["maternal", "wife"], dad: ["maternal", "wife"] };

    const result = resolveBranchAddresses(
      "ego",
      "dad",
      context(persons, relationships, membership),
    );
    const byBranch = new Map(
      result.map((entry) => [entry.branch?.id, entry.resolution.entry?.spoken.call]),
    );

    expect(byBranch.get("maternal")).toBe("bố");
    expect(byBranch.get("wife")).toBe("ba");
  });

  it("applies a branch's provincial override on top of its region", () => {
    const result = resolveBranchAddresses(
      "ego",
      "grandma",
      context(
        [male("ego", 1990), male("dad", 1960), female("grandma", 1935)],
        [
          { person_id: "dad", related_to_id: "ego", rel_type: "PARENT_OF" },
          { person_id: "grandma", related_to_id: "dad", rel_type: "PARENT_OF" },
        ],
        { ego: ["paternal"], grandma: ["paternal"] },
      ),
    );

    expect(result[0].resolution.entry?.spoken.call).toBe("mệ");
  });

  it("reports SELF without inventing a branch", () => {
    const result = resolveBranchAddresses(
      "ego",
      "ego",
      context([male("ego", 1990)], [], { ego: ["paternal"] }),
    );

    expect(result[0].resolution.status).toBe("SELF");
  });
});
