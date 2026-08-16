import type { DictSelfRef, RegionProfile } from "../types";
import { BAC } from "./bac";

const PARENT_SELF_REF: DictSelfRef = { MALE: "ba", FEMALE: "má" };

/** Miền Nam. Birth order counts from 2 (anh Hai): offset applied by ordinalLabel. */
export const NAM: RegionProfile = {
  code: "NAM",
  region: "NAM",
  birthOrderOffset: 1,
  entries: {
    ...BAC.entries,
    F: { spoken: { call: "ba", selfRef: "con" }, formal: { call: "cha", selfRef: "con" }, reference: { call: "ba", selfRef: "con" } },
    M: { spoken: { call: "má", selfRef: "con" }, formal: { call: "mẹ", selfRef: "con" }, reference: { call: "má", selfRef: "con" } },
    WF: { spoken: { call: "ba", selfRef: "con" }, formal: { call: "nhạc phụ", selfRef: "con rể" }, reference: { call: "ba vợ", selfRef: "con rể" } },
    WM: { spoken: { call: "má", selfRef: "con" }, formal: { call: "nhạc mẫu", selfRef: "con rể" }, reference: { call: "má vợ", selfRef: "con rể" } },
    HF: { spoken: { call: "ba", selfRef: "con" }, formal: { call: "nhạc phụ", selfRef: "con dâu" }, reference: { call: "ba chồng", selfRef: "con dâu" } },
    HM: { spoken: { call: "má", selfRef: "con" }, formal: { call: "nhạc mẫu", selfRef: "con dâu" }, reference: { call: "má chồng", selfRef: "con dâu" } },
    S: { spoken: { call: "con", selfRef: PARENT_SELF_REF }, formal: { call: "con trai", selfRef: PARENT_SELF_REF }, reference: { call: "con trai", selfRef: PARENT_SELF_REF } },
    D: { spoken: { call: "con", selfRef: PARENT_SELF_REF }, formal: { call: "con gái", selfRef: PARENT_SELF_REF }, reference: { call: "con gái", selfRef: PARENT_SELF_REF } },
    SW: { spoken: { call: "con", selfRef: PARENT_SELF_REF }, formal: { call: "con dâu", selfRef: PARENT_SELF_REF }, reference: { call: "con dâu", selfRef: PARENT_SELF_REF } },
    DH: { spoken: { call: "con", selfRef: PARENT_SELF_REF }, formal: { call: "con rể", selfRef: PARENT_SELF_REF }, reference: { call: "con rể", selfRef: PARENT_SELF_REF } },
  },
};
