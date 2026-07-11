import { describe, expect, it } from "vitest";
import {
  GenealogyValidationError,
  validateFamilyChildMembership,
  validateFamilyPartnerMembership,
  validateRelationship,
} from "./validation";

const persons = new Set(["a", "b", "c"]);
const unions = new Set(["u"]);

describe("genealogy validation", () => {
  it("rejects self-links, missing people, and duplicate relationships", () => {
    expect(() =>
      validateRelationship({ person_id: "a", related_to_id: "a", rel_type: "SPOUSE" }, persons, []),
    ).toThrow(GenealogyValidationError);
    expect(() =>
      validateRelationship({ person_id: "a", related_to_id: "missing", rel_type: "SPOUSE" }, persons, []),
    ).toThrow("không còn tồn tại");
    expect(() =>
      validateRelationship(
        { person_id: "a", related_to_id: "b", rel_type: "SPOUSE" },
        persons,
        [{ person_id: "a", related_to_id: "b", rel_type: "SPOUSE" }],
      ),
    ).toThrow("đã tồn tại");
  });

  it("rejects a parent link that creates an ancestor cycle", () => {
    expect(() =>
      validateRelationship(
        { person_id: "c", related_to_id: "a", rel_type: "PARENT_OF" },
        persons,
        [
          { person_id: "a", related_to_id: "b", rel_type: "PARENT_OF" },
          { person_id: "b", related_to_id: "c", rel_type: "PARENT_OF" },
        ],
      ),
    ).toThrow("vòng lặp tổ tiên");
  });

  it("rejects ancestor cycles that pass through adoptive parentage", () => {
    expect(() =>
      validateRelationship(
        { person_id: "c", related_to_id: "a", rel_type: "PARENT_OF" },
        persons,
        [
          { person_id: "a", related_to_id: "b", rel_type: "ADOPTED_PARENT_OF" },
          { person_id: "b", related_to_id: "c", rel_type: "PARENT_OF" },
        ],
      ),
    ).toThrow("vòng lặp tổ tiên");
    expect(() =>
      validateRelationship(
        { person_id: "c", related_to_id: "a", rel_type: "ADOPTED_PARENT_OF" },
        persons,
        [
          { person_id: "a", related_to_id: "b", rel_type: "PARENT_OF" },
          { person_id: "b", related_to_id: "c", rel_type: "PARENT_OF" },
        ],
      ),
    ).toThrow("vòng lặp tổ tiên");
  });

  it("rejects duplicate and contradictory family memberships", () => {
    const partners = [{ familyUnionId: "u", personId: "a" }];
    const children = [{ familyUnionId: "u", childPersonId: "b" }];

    expect(() =>
      validateFamilyPartnerMembership({ familyUnionId: "u", personId: "a" }, persons, unions, partners, children),
    ).toThrow("đã là partner");
    expect(() =>
      validateFamilyPartnerMembership({ familyUnionId: "u", personId: "b" }, persons, unions, partners, children),
    ).toThrow("vừa là partner vừa là con");
    expect(() =>
      validateFamilyChildMembership({ familyUnionId: "u", childPersonId: "a" }, persons, unions, partners, children),
    ).toThrow("vừa là partner vừa là con");
  });
});
