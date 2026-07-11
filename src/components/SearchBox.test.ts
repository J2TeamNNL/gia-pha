import { describe, expect, it } from "vitest";
import { normalizeForSearch, searchPersons } from "./SearchBox";
import type { Person } from "@/db/types";

function person(overrides: Partial<Person>): Person {
  return {
    id: "id",
    first_name: "An",
    gender: "MALE",
    is_living: true,
    ...overrides,
  };
}

describe("person search", () => {
  it("strips Vietnamese diacritics and case", () => {
    expect(normalizeForSearch("Nguyễn Văn Đức")).toBe("nguyen van duc");
    expect(normalizeForSearch("  TRẦN  ")).toBe("tran");
  });

  it("matches accented names from unaccented queries and vice versa", () => {
    const persons = [
      person({ id: "1", last_name: "Nguyễn", middle_name: "Văn", first_name: "Đức" }),
      person({ id: "2", last_name: "Trần", first_name: "Bình" }),
    ];
    expect(searchPersons(persons, "duc").map((p) => p.id)).toEqual(["1"]);
    expect(searchPersons(persons, "Trần B").map((p) => p.id)).toEqual(["2"]);
    expect(searchPersons(persons, "nguyen van").map((p) => p.id)).toEqual(["1"]);
  });

  it("returns nothing for a blank query and caps results at 8", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      person({ id: String(i), first_name: `An${i}` }),
    );
    expect(searchPersons(many, "  ")).toEqual([]);
    expect(searchPersons(many, "an")).toHaveLength(8);
  });
});
