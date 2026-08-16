import { describe, expect, it } from "vitest";
import { computeDerivedBranchMembers } from "./branchMembership";

describe("computeDerivedBranchMembers", () => {
  it("includes the root and every descendant", () => {
    const relationships = [
      { person_id: "root", related_to_id: "child", rel_type: "PARENT_OF" as const },
      { person_id: "child", related_to_id: "grandchild", rel_type: "ADOPTED_PARENT_OF" as const },
    ];

    const members = computeDerivedBranchMembers(["root"], relationships);

    expect(members).toEqual(new Set(["root", "child", "grandchild"]));
  });

  it("includes people married into a descendant", () => {
    const relationships = [
      { person_id: "root", related_to_id: "child", rel_type: "PARENT_OF" as const },
      { person_id: "child", related_to_id: "spouse", rel_type: "SPOUSE" as const },
      { person_id: "ex", related_to_id: "root", rel_type: "EX_SPOUSE" as const },
    ];

    const members = computeDerivedBranchMembers(["root"], relationships);

    expect(members).toEqual(new Set(["root", "child", "spouse", "ex"]));
  });

  it("does not pull in a sibling branch that shares no root", () => {
    const relationships = [
      { person_id: "parent", related_to_id: "branchA", rel_type: "PARENT_OF" as const },
      { person_id: "parent", related_to_id: "branchB", rel_type: "PARENT_OF" as const },
    ];

    const membersA = computeDerivedBranchMembers(["branchA"], relationships);
    const membersB = computeDerivedBranchMembers(["branchB"], relationships);

    expect(membersA).toEqual(new Set(["branchA"]));
    expect(membersB).toEqual(new Set(["branchB"]));
  });

  it("lets one person surface in two independently computed branches", () => {
    const relationships = [
      { person_id: "paternalRoot", related_to_id: "founder", rel_type: "PARENT_OF" as const },
      { person_id: "founder", related_to_id: "spouse", rel_type: "SPOUSE" as const },
      { person_id: "spouseRoot", related_to_id: "spouse", rel_type: "PARENT_OF" as const },
    ];

    const paternalMembers = computeDerivedBranchMembers(["paternalRoot"], relationships);
    const spouseSideMembers = computeDerivedBranchMembers(["spouseRoot"], relationships);

    expect(paternalMembers.has("founder")).toBe(true);
    expect(spouseSideMembers.has("spouse")).toBe(true);
    // founder's spouse belongs to both the paternal branch (married-in) and
    // their own root's branch (descendant) at the same time.
    expect(paternalMembers.has("spouse")).toBe(true);
    expect(spouseSideMembers.has("spouse")).toBe(true);
  });
});
