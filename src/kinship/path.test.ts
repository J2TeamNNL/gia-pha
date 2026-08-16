import { describe, expect, it } from "vitest";
import { MAX_PATH_DEPTH, resolvePath } from "./path";
import type { KinshipPerson, KinshipRelationship } from "./types";

function person(id: string, gender: KinshipPerson["gender"], birthYear?: number): KinshipPerson {
  return { id, gender, birth_year: birthYear };
}

describe("resolvePath", () => {
  it("returns SELF for ego === target", () => {
    const persons = [person("ego", "MALE")];
    expect(resolvePath("ego", "ego", persons, []).signature).toBe("SELF");
  });

  it("resolves father's elder brother as FeB and younger brother as FyB", () => {
    const persons: KinshipPerson[] = [
      person("gf", "MALE"),
      person("gm", "FEMALE"),
      person("father", "MALE", 1970),
      person("uncleElder", "MALE", 1965),
      person("uncleYounger", "MALE", 1975),
      person("mother", "FEMALE", 1972),
      person("ego", "MALE", 2000),
    ];
    const relationships: KinshipRelationship[] = [
      { person_id: "gf", related_to_id: "father", rel_type: "PARENT_OF" },
      { person_id: "gm", related_to_id: "father", rel_type: "PARENT_OF" },
      { person_id: "gf", related_to_id: "uncleElder", rel_type: "PARENT_OF" },
      { person_id: "gm", related_to_id: "uncleElder", rel_type: "PARENT_OF" },
      { person_id: "gf", related_to_id: "uncleYounger", rel_type: "PARENT_OF" },
      { person_id: "gm", related_to_id: "uncleYounger", rel_type: "PARENT_OF" },
      { person_id: "father", related_to_id: "ego", rel_type: "PARENT_OF" },
      { person_id: "mother", related_to_id: "ego", rel_type: "PARENT_OF" },
    ];

    expect(resolvePath("ego", "uncleElder", persons, relationships).signature).toBe("FeB");
    expect(resolvePath("ego", "uncleYounger", persons, relationships).signature).toBe("FyB");
  });

  it("resolves mother's brother as MB regardless of unknown seniority", () => {
    const persons: KinshipPerson[] = [
      person("mgf", "MALE"),
      person("mother", "FEMALE", 1972),
      person("motherBrother", "MALE"), // no birth date on file
      person("father", "MALE", 1970),
      person("ego", "MALE", 2000),
    ];
    const relationships: KinshipRelationship[] = [
      { person_id: "mgf", related_to_id: "mother", rel_type: "PARENT_OF" },
      { person_id: "mgf", related_to_id: "motherBrother", rel_type: "PARENT_OF" },
      { person_id: "father", related_to_id: "ego", rel_type: "PARENT_OF" },
      { person_id: "mother", related_to_id: "ego", rel_type: "PARENT_OF" },
    ];

    const result = resolvePath("ego", "motherBrother", persons, relationships);
    expect(result.signature).toBe("MB");
    expect(result.hops.at(-1)?.seniority).toBe("UNKNOWN");
  });

  it("produces an unmarked bare signature when a term-relevant sibling's seniority is unknown", () => {
    const persons: KinshipPerson[] = [
      person("gf", "MALE"),
      person("gm", "FEMALE"),
      person("father", "MALE", 1970),
      person("uncleUnknownAge", "MALE"), // no birth date -> seniority vs father is UNKNOWN
      person("mother", "FEMALE", 1972),
      person("ego", "MALE", 2000),
    ];
    const relationships: KinshipRelationship[] = [
      { person_id: "gf", related_to_id: "father", rel_type: "PARENT_OF" },
      { person_id: "gm", related_to_id: "father", rel_type: "PARENT_OF" },
      { person_id: "gf", related_to_id: "uncleUnknownAge", rel_type: "PARENT_OF" },
      { person_id: "gm", related_to_id: "uncleUnknownAge", rel_type: "PARENT_OF" },
      { person_id: "father", related_to_id: "ego", rel_type: "PARENT_OF" },
      { person_id: "mother", related_to_id: "ego", rel_type: "PARENT_OF" },
    ];

    expect(resolvePath("ego", "uncleUnknownAge", persons, relationships).signature).toBe("FB");
  });

  it("breaks ties deterministically via the fixed hop-priority order (F before M)", () => {
    // Uncle X is reachable in 2 hops both as father's younger brother (FyB)
    // and as mother's second husband (MH) — a Levirate remarriage. F precedes
    // M in HOP_PRIORITY, so the father-side path must win.
    const persons: KinshipPerson[] = [
      person("gf", "MALE"),
      person("gm", "FEMALE"),
      person("father", "MALE", 1970),
      person("uncleX", "MALE", 1978),
      person("mother", "FEMALE", 1975),
      person("ego", "MALE", 2000),
    ];
    const relationships: KinshipRelationship[] = [
      { person_id: "gf", related_to_id: "father", rel_type: "PARENT_OF" },
      { person_id: "gm", related_to_id: "father", rel_type: "PARENT_OF" },
      { person_id: "gf", related_to_id: "uncleX", rel_type: "PARENT_OF" },
      { person_id: "gm", related_to_id: "uncleX", rel_type: "PARENT_OF" },
      { person_id: "father", related_to_id: "ego", rel_type: "PARENT_OF" },
      { person_id: "mother", related_to_id: "ego", rel_type: "PARENT_OF" },
      { person_id: "mother", related_to_id: "uncleX", rel_type: "SPOUSE" },
    ];

    const result = resolvePath("ego", "uncleX", persons, relationships);
    expect(result.signature).toBe("FyB");

    // Shuffling relationship order must not change the outcome.
    const shuffled = [...relationships].reverse();
    expect(resolvePath("ego", "uncleX", persons, shuffled).signature).toBe("FyB");
  });

  it("resolves wife's father directly as WF (spouse-side affinal path)", () => {
    const persons: KinshipPerson[] = [
      person("ego", "MALE"),
      person("wife", "FEMALE"),
      person("wifeFather", "MALE"),
    ];
    const relationships: KinshipRelationship[] = [
      { person_id: "ego", related_to_id: "wife", rel_type: "SPOUSE" },
      { person_id: "wifeFather", related_to_id: "wife", rel_type: "PARENT_OF" },
    ];

    expect(resolvePath("ego", "wifeFather", persons, relationships).signature).toBe("WF");
  });

  it("caps search at MAX_PATH_DEPTH and reports DISTANT beyond it", () => {
    const persons: KinshipPerson[] = ["ego", "f1", "f2", "f3", "f4", "f5"].map((id) =>
      person(id, "MALE"),
    );
    const relationships: KinshipRelationship[] = [
      { person_id: "f1", related_to_id: "ego", rel_type: "PARENT_OF" },
      { person_id: "f2", related_to_id: "f1", rel_type: "PARENT_OF" },
      { person_id: "f3", related_to_id: "f2", rel_type: "PARENT_OF" },
      { person_id: "f4", related_to_id: "f3", rel_type: "PARENT_OF" },
      { person_id: "f5", related_to_id: "f4", rel_type: "PARENT_OF" },
    ];

    expect(MAX_PATH_DEPTH).toBe(4);
    const withinCap = resolvePath("ego", "f4", persons, relationships);
    expect(withinCap.signature).toBe("FFFF");
    expect(withinCap.distant).toBe(false);

    const beyondCap = resolvePath("ego", "f5", persons, relationships);
    expect(beyondCap.signature).toBe("DISTANT");
    expect(beyondCap.distant).toBe(true);
  });
});
