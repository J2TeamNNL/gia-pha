import { describe, expect, it } from "vitest";
import { labelFor } from "./kinshipLabel";
import type { BranchAddress } from "@/kinship";

function address(
  status: BranchAddress["resolution"]["status"],
  call?: string,
): BranchAddress {
  const pair = { call: call ?? "", selfRef: "cháu" };
  return {
    branch: null,
    resolution: {
      status,
      signature: "FeB",
      entry: call
        ? { spoken: pair, formal: pair, reference: pair }
        : undefined,
    },
  };
}

describe("labelFor", () => {
  it("takes the first branch that resolved", () => {
    const label = labelFor([address("UNKNOWN_SENIORITY"), address("OK", "bác")]);
    expect(label.call).toBe("bác");
    expect(label.unknown).toBe(false);
  });

  it("flags an unresolved term rather than leaving it blank", () => {
    const label = labelFor([address("UNKNOWN_SENIORITY")]);
    expect(label.call).toBeNull();
    expect(label.unknown).toBe(true);
  });

  it("stays silent for a distant relative rather than flagging missing data", () => {
    const label = labelFor([address("DISTANT")]);
    expect(label.call).toBeNull();
    expect(label.unknown).toBe(false);
  });

  it("keeps every branch so the panel can show them all", () => {
    const label = labelFor([address("OK", "bác"), address("OK", "cậu")]);
    expect(label.addresses).toHaveLength(2);
  });
});
