import { describe, expect, it } from "vitest";
import type { PathResult, RegionProfile } from "../types";
import { BAC, NAM, TRUNG, TRUNG_QUANG_TRI, birthOrderLabel, resolveAddress } from "./index";

function path(signature: string, distant = false): PathResult {
  return { signature, hops: [], distant };
}

// Ego gender only changes descending and lateral terms; these cases are all
// ascending or affinal, so any gender resolves identically.
function resolve(profile: RegionProfile, signature: string, distant = false) {
  return resolveAddress(profile, path(signature, distant), "MALE");
}

describe("resolveAddress", () => {
  it("distinguishes bác (elder) from chú (younger)", () => {
    expect(resolve(BAC, "FeB").entry?.spoken.call).toBe("bác");
    expect(resolve(BAC, "FyB").entry?.spoken.call).toBe("chú");
  });

  it("resolves cậu (mother's brother) without needing a seniority marker", () => {
    const resolution = resolve(BAC, "MB");
    expect(resolution.status).toBe("OK");
    expect(resolution.entry?.spoken.call).toBe("cậu");
  });

  it("falls back from a seniority-marked signature to the bare entry when the term is age-invariant", () => {
    const resolution = resolve(BAC, "MeB");
    expect(resolution.status).toBe("OK");
    expect(resolution.signature).toBe("MB");
    expect(resolution.entry?.spoken.call).toBe("cậu");
  });

  it("reports UNKNOWN_SENIORITY instead of guessing bác vs chú", () => {
    const resolution = resolve(BAC, "FB");
    expect(resolution.status).toBe("UNKNOWN_SENIORITY");
    expect(resolution.entry).toBeUndefined();
  });

  it("reports SELF and DISTANT as their own statuses, never NOT_FOUND", () => {
    expect(resolve(BAC, "SELF").status).toBe("SELF");
    expect(resolve(BAC, "DISTANT", true).status).toBe("DISTANT");
  });

  it("reports NOT_FOUND for a signature the dictionary has no coverage for at all", () => {
    expect(resolve(BAC, "FFFFW").status).toBe("NOT_FOUND");
  });

  it("resolves the wife's father directly, adopting her spoken term for her own father", () => {
    const resolution = resolve(BAC, "WF");
    expect(resolution.status).toBe("OK");
    expect(resolution.entry?.spoken).toEqual({ call: "bố", selfRef: "con" });
    expect(resolution.entry?.reference.call).toBe("bố vợ");
  });
});

describe("regional dictionaries", () => {
  it("BAC and NAM differ on the direct parent term", () => {
    expect(resolve(BAC, "F").entry?.spoken.call).toBe("bố");
    expect(resolve(NAM, "F").entry?.spoken.call).toBe("ba");
  });

  it("TRUNG uses o for a father's sister regardless of seniority", () => {
    expect(resolve(TRUNG, "FeZ").entry?.spoken.call).toBe("o");
    expect(resolve(TRUNG, "FyZ").entry?.spoken.call).toBe("o");
  });

  it("Quảng Trị overrides one entry and inherits the rest of TRUNG", () => {
    expect(resolve(TRUNG_QUANG_TRI, "FM").entry?.spoken.call).toBe("mệ");
    expect(resolve(TRUNG_QUANG_TRI, "F").entry?.spoken.call).toBe(
      resolve(TRUNG, "F").entry?.spoken.call,
    );
  });
});

describe("birthOrderLabel", () => {
  it("BAC and TRUNG count from 1 (anh Cả)", () => {
    expect(birthOrderLabel(1, BAC)).toBe("Cả");
    expect(birthOrderLabel(2, BAC)).toBe("Hai");
    expect(birthOrderLabel(1, TRUNG)).toBe("Cả");
  });

  it("NAM applies the +1 offset so rank 1 becomes anh Hai", () => {
    expect(birthOrderLabel(1, NAM)).toBe("Hai");
    expect(birthOrderLabel(2, NAM)).toBe("Ba");
  });
});
