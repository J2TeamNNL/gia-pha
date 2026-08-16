import { describe, expect, it } from "vitest";
import { branchColor, branchColorMap } from "./branchColor";

describe("branchColor", () => {
  it("gives neighbouring branches different colours", () => {
    expect(branchColor(0)).not.toBe(branchColor(1));
    expect(branchColor(1)).not.toBe(branchColor(2));
  });

  it("wraps round rather than running out", () => {
    expect(branchColor(6)).toBe(branchColor(0));
    expect(branchColor(-1)).toBe(branchColor(5));
  });
});

describe("branchColorMap", () => {
  it("keys a colour to every branch id", () => {
    const map = branchColorMap(["a", "b", "c"]);
    expect([...map.keys()]).toEqual(["a", "b", "c"]);
    expect(new Set(map.values()).size).toBe(3);
  });
});
