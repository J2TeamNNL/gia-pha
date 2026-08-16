import type { DictAddressEntry } from "../types";

/**
 * Illustrative Quảng Trị override on top of TRUNG (per context.md §9, provincial
 * coverage beyond this example is unscoped). Overrides FM only; every other
 * entry is inherited from TRUNG.
 */
export const QUANG_TRI_OVERRIDES: Record<string, DictAddressEntry> = {
  FM: {
    spoken: { call: "mệ", selfRef: "cháu" },
    formal: { call: "nội tổ", selfRef: "cháu" },
    reference: { call: "mệ nội", selfRef: "cháu" },
  },
};
