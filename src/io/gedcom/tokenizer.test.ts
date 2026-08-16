import { describe, expect, it } from "vitest";
import { mergeContinuations, tokenizeGedcom } from "./tokenizer";

describe("tokenizeGedcom", () => {
  it("parses level, xref, tag, and value", () => {
    const { lines, lossEntries } = tokenizeGedcom(
      ["0 @I1@ INDI", "1 NAME John /Smith/", "1 SEX M"].join("\n"),
    );

    expect(lossEntries).toEqual([]);
    expect(lines).toEqual([
      { level: 0, xref: "@I1@", tag: "INDI", value: undefined, line: 1 },
      { level: 1, xref: undefined, tag: "NAME", value: "John /Smith/", line: 2 },
      { level: 1, xref: undefined, tag: "SEX", value: "M", line: 3 },
    ]);
  });

  it("treats a pointer value as data, not an xref declaration", () => {
    const { lines } = tokenizeGedcom("1 HUSB @I1@");
    expect(lines).toEqual([{ level: 1, xref: undefined, tag: "HUSB", value: "@I1@", line: 1 }]);
  });

  it("reports a malformed line without throwing, and keeps parsing", () => {
    const { lines, lossEntries } = tokenizeGedcom(
      ["0 @I1@ INDI", "this is not a gedcom line", "1 SEX M"].join("\n"),
    );

    expect(lines).toHaveLength(2);
    expect(lossEntries).toHaveLength(1);
    expect(lossEntries[0]).toMatchObject({ kind: "malformed_line", line: 2 });
  });

  it("skips blank lines silently", () => {
    const { lines, lossEntries } = tokenizeGedcom("0 @I1@ INDI\n\n1 SEX M");
    expect(lines).toHaveLength(2);
    expect(lossEntries).toEqual([]);
  });
});

describe("mergeContinuations", () => {
  it("joins CONT with a newline and CONC directly", () => {
    const { lines } = tokenizeGedcom(
      ["0 @I1@ INDI", "1 NOTE First line", "2 CONT Second line", "2 CONC , continued"].join("\n"),
    );
    const merged = mergeContinuations(lines);
    const note = merged.find((line) => line.tag === "NOTE");
    expect(note?.value).toBe("First line\nSecond line, continued");
  });
});
