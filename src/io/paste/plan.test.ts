import { describe, expect, it } from "vitest";
import type { Person } from "@/db/types";
import { planPaste } from "./plan";
import { parseTable } from "./table";

const HEADER = "Họ tên\tGiới tính\tNăm sinh\tCha\tMẹ\tVợ/Chồng";

function tsv(...lines: string[]): string {
  return [HEADER, ...lines].join("\n");
}

function stored(overrides: Partial<Person>): Person {
  return {
    id: "stored-1",
    first_name: "An",
    last_name: "Nguyễn",
    gender: "MALE",
    is_living: true,
    ...overrides,
  };
}

describe("parseTable", () => {
  it("splits a spreadsheet copy on tabs and drops blank lines", () => {
    expect(parseTable("a\tb\n\nc\td\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("keeps a quoted comma inside a CSV cell", () => {
    expect(parseTable('a,"Hà Nội, Việt Nam"')).toEqual([
      ["a", "Hà Nội, Việt Nam"],
    ]);
  });
});

describe("planPaste", () => {
  it("reads a header row and splits Vietnamese names surname-first", () => {
    const plan = planPaste(tsv("Nguyễn Văn An\tNam\t1950"));

    expect(plan.hasHeader).toBe(true);
    expect(plan.persons).toHaveLength(1);
    expect(plan.persons[0]).toMatchObject({
      last_name: "Nguyễn",
      middle_name: "Văn",
      first_name: "An",
      gender: "MALE",
      birth_year: 1950,
    });
  });

  it("falls back to the default column order without a header", () => {
    const plan = planPaste("Nguyễn Văn An\tNam\t1950");

    expect(plan.hasHeader).toBe(false);
    expect(plan.persons).toHaveLength(1);
    expect(plan.persons[0].birth_year).toBe(1950);
  });

  it("links a child to a parent named in the same paste", () => {
    const plan = planPaste(
      tsv("Nguyễn Văn An\tNam\t1950", "Nguyễn Văn Bình\tNam\t1980\tNguyễn Văn An"),
    );

    expect(plan.errorCount).toBe(0);
    expect(plan.relationships).toEqual([
      {
        person_external_id: "row-1",
        related_to_external_id: "row-2",
        rel_type: "PARENT_OF",
      },
    ]);
  });

  it("links to a person already stored in the tree", () => {
    const plan = planPaste(tsv("Nguyễn Văn Bình\tNam\t1980\tNguyễn An"), [
      stored({ id: "stored-1" }),
    ]);

    expect(plan.relationships[0].person_external_id).toBe("stored-1");
  });

  it("emits one spouse edge when both people name each other", () => {
    const plan = planPaste(
      tsv(
        "Nguyễn Văn An\tNam\t1950\t\t\tTrần Thị Bích",
        "Trần Thị Bích\tNữ\t1952\t\t\tNguyễn Văn An",
      ),
    );

    expect(plan.relationships).toHaveLength(1);
    expect(plan.relationships[0].rel_type).toBe("SPOUSE");
  });

  it("refuses to guess between two people with the same name", () => {
    const plan = planPaste(
      tsv(
        "Nguyễn Văn An\tNam\t1950",
        "Nguyễn Văn An\tNam\t1960",
        "Nguyễn Văn Bình\tNam\t1980\tNguyễn Văn An",
      ),
    );

    expect(plan.errorCount).toBe(1);
    expect(plan.rows[2].issues[0].message).toContain("2 người");
    expect(plan.relationships).toHaveLength(0);
  });

  it("accepts a birth year in brackets to disambiguate", () => {
    const plan = planPaste(
      tsv(
        "Nguyễn Văn An\tNam\t1950",
        "Nguyễn Văn An\tNam\t1960",
        "Nguyễn Văn Bình\tNam\t1980\tNguyễn Văn An (1960)",
      ),
    );

    expect(plan.errorCount).toBe(0);
    expect(plan.relationships[0].person_external_id).toBe("row-2");
  });

  it("flags an unknown parent name as an error and drops the link", () => {
    const plan = planPaste(tsv("Nguyễn Văn Bình\tNam\t1980\tNgười Lạ"));

    expect(plan.errorCount).toBe(1);
    expect(plan.persons).toHaveLength(0);
    expect(plan.relationships).toHaveLength(0);
  });

  it("warns rather than guesses when gender is missing", () => {
    const plan = planPaste(tsv("Nguyễn Văn An\t\t1950"));

    expect(plan.errorCount).toBe(0);
    expect(plan.warningCount).toBe(1);
    expect(plan.persons[0].gender).toBe("UNKNOWN");
  });

  it("marks a person with a death year as no longer living", () => {
    const plan = planPaste(
      "Họ tên\tNăm sinh\tNăm mất\nNguyễn Văn An\t1950\t2020",
    );

    expect(plan.persons[0]).toMatchObject({ is_living: false, death_year: 2020 });
  });

  it("rejects a row naming itself as a parent", () => {
    const plan = planPaste(tsv("Nguyễn Văn An\tNam\t1950\tNguyễn Văn An"));

    expect(plan.errorCount).toBe(1);
    expect(plan.rows[0].issues[0].message).toContain("chính mình");
  });

  it("reports a missing name and keeps the row out of the import", () => {
    const plan = planPaste(tsv("\tNam\t1950"));

    expect(plan.errorCount).toBe(1);
    expect(plan.persons).toHaveLength(0);
  });
});
