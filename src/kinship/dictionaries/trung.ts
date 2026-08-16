import type { DictSelfRef, RegionProfile } from "../types";
import { BAC } from "./bac";

const PARENT_SELF_REF: DictSelfRef = { MALE: "bọ", FEMALE: "mạ" };

/** Miền Trung (general/Huế-leaning). Same birth-order convention as Bắc. */
export const TRUNG: RegionProfile = {
  code: "TRUNG",
  region: "TRUNG",
  birthOrderOffset: 0,
  entries: {
    ...BAC.entries,
    F: { spoken: { call: "bọ", selfRef: "con" }, formal: { call: "cha", selfRef: "con" }, reference: { call: "bọ", selfRef: "con" } },
    M: { spoken: { call: "mạ", selfRef: "con" }, formal: { call: "mẹ", selfRef: "con" }, reference: { call: "mạ", selfRef: "con" } },
    FeZ: { spoken: { call: "o", selfRef: "cháu" }, formal: { call: "o", selfRef: "cháu" }, reference: { call: "o", selfRef: "cháu" } },
    FyZ: { spoken: { call: "o", selfRef: "cháu" }, formal: { call: "o", selfRef: "cháu" }, reference: { call: "o", selfRef: "cháu" } },
    S: { spoken: { call: "con", selfRef: PARENT_SELF_REF }, formal: { call: "con trai", selfRef: PARENT_SELF_REF }, reference: { call: "con trai", selfRef: PARENT_SELF_REF } },
    D: { spoken: { call: "con", selfRef: PARENT_SELF_REF }, formal: { call: "con gái", selfRef: PARENT_SELF_REF }, reference: { call: "con gái", selfRef: PARENT_SELF_REF } },
    SW: { spoken: { call: "con", selfRef: PARENT_SELF_REF }, formal: { call: "con dâu", selfRef: PARENT_SELF_REF }, reference: { call: "con dâu", selfRef: PARENT_SELF_REF } },
    DH: { spoken: { call: "con", selfRef: PARENT_SELF_REF }, formal: { call: "con rể", selfRef: PARENT_SELF_REF }, reference: { call: "con rể", selfRef: PARENT_SELF_REF } },
  },
};
