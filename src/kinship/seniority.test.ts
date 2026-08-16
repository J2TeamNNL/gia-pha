import { describe, expect, it } from "vitest";
import { compareSeniority } from "./seniority";

describe("compareSeniority", () => {
  it("prefers birth_order over any date field", () => {
    expect(
      compareSeniority(
        { birth_order: 1, birth_year: 1990 },
        { birth_order: 2, birth_year: 1980 },
      ),
    ).toBe("ELDER");
  });

  it("falls back to birth_year when birth_order is absent", () => {
    expect(compareSeniority({ birth_year: 1980 }, { birth_year: 1990 })).toBe("ELDER");
    expect(compareSeniority({ birth_year: 1995 }, { birth_year: 1990 })).toBe("YOUNGER");
  });

  it("falls back to birth_month then birth_day on a tied year", () => {
    expect(
      compareSeniority({ birth_year: 1990, birth_month: 1 }, { birth_year: 1990, birth_month: 6 }),
    ).toBe("ELDER");
    expect(
      compareSeniority(
        { birth_year: 1990, birth_month: 6, birth_day: 1 },
        { birth_year: 1990, birth_month: 6, birth_day: 20 },
      ),
    ).toBe("ELDER");
  });

  it("never guesses: returns UNKNOWN when no field disambiguates", () => {
    expect(compareSeniority({}, {})).toBe("UNKNOWN");
    expect(compareSeniority({ birth_year: 1990 }, { birth_month: 5 })).toBe("UNKNOWN");
    expect(compareSeniority({ birth_year: 1990 }, { birth_year: 1990 })).toBe("UNKNOWN");
  });
});
