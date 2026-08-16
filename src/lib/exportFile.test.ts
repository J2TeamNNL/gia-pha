import { describe, expect, it } from "vitest";
import { toDelimited } from "./exportFile";

describe("toDelimited", () => {
  it("quotes a CSV cell holding a comma", () => {
    expect(toDelimited([["a", "Hà Nội, Việt Nam"]], "csv")).toBe(
      'a,"Hà Nội, Việt Nam"',
    );
  });

  it("doubles an embedded quote", () => {
    expect(toDelimited([['say "hi"']], "csv")).toBe('"say ""hi"""');
  });

  it("leaves a plain cell untouched", () => {
    expect(toDelimited([["bác", "cháu"]], "csv")).toBe("bác,cháu");
  });

  it("flattens tabs and newlines in TSV rather than breaking the row", () => {
    expect(toDelimited([["a\tb", "c\nd"]], "tsv")).toBe("a b\tc d");
  });

  it("joins rows with newlines", () => {
    expect(toDelimited([["a"], ["b"]], "csv")).toBe("a\nb");
  });
});

describe("formula safety", () => {
  it("keeps a name opening with = from running as a formula", () => {
    expect(toDelimited([["=1+1"]], "csv")).toBe("'=1+1");
    expect(toDelimited([["=1+1"]], "tsv")).toBe("'=1+1");
  });

  it("covers the other formula openers Excel honours", () => {
    for (const cell of ["+A1", "-A1", "@SUM(A1)"]) {
      expect(toDelimited([[cell]], "csv")).toBe(`'${cell}`);
    }
  });

  it("leaves an ordinary Vietnamese name alone", () => {
    expect(toDelimited([["Nguyễn Văn An"]], "csv")).toBe("Nguyễn Văn An");
  });
});
