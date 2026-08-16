import { describe, expect, it } from "vitest";
import { parseGedcomDate } from "./dates";

describe("parseGedcomDate", () => {
  it("parses a full date", () => {
    expect(parseGedcomDate("12 JAN 1950")).toEqual({
      precision: "DAY",
      year: 1950,
      month: 1,
      day: 12,
      sourceText: "12 JAN 1950",
    });
  });

  it("parses a month/year date", () => {
    expect(parseGedcomDate("JAN 1950")).toEqual({
      precision: "MONTH",
      year: 1950,
      month: 1,
      sourceText: "JAN 1950",
    });
  });

  it("parses a year-only date", () => {
    expect(parseGedcomDate("1950")).toEqual({ precision: "YEAR", year: 1950, sourceText: "1950" });
  });

  it("keeps the qualifier and underlying granularity for an approximate date", () => {
    expect(parseGedcomDate("ABT 1950")).toEqual({
      precision: "YEAR",
      qualifier: "ABT",
      year: 1950,
      sourceText: "ABT 1950",
    });
  });

  it("parses a BET ... AND range", () => {
    expect(parseGedcomDate("BET 1940 AND 1950")).toEqual({
      precision: "RANGE",
      year: 1940,
      endYear: 1950,
      sourceText: "BET 1940 AND 1950",
    });
  });

  it("never invents precision for unparseable text", () => {
    const result = parseGedcomDate("@#DJULIAN@ 12 JAN 1950");
    expect(result.precision).toBe("TEXT");
    expect(result.year).toBeUndefined();
    expect(result.sourceText).toBe("@#DJULIAN@ 12 JAN 1950");
  });
});
