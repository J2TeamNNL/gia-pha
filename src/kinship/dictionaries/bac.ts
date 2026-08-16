import type { DictAddressEntry, DictSelfRef, RegionProfile } from "../types";

/** How a parent refers to themselves when addressing their own child (BAC). */
export const PARENT_SELF_REF: DictSelfRef = { MALE: "bố", FEMALE: "mẹ" };
const SIBLING_SELF_REF: DictSelfRef = { MALE: "anh", FEMALE: "chị" };
const GRANDPARENT_SELF_REF: DictSelfRef = { MALE: "ông", FEMALE: "bà" };

const CHAU_NOI: DictAddressEntry = {
  spoken: { call: "cháu", selfRef: GRANDPARENT_SELF_REF },
  formal: { call: "cháu", selfRef: GRANDPARENT_SELF_REF },
  reference: { call: "cháu nội", selfRef: GRANDPARENT_SELF_REF },
};
const CHAU_NGOAI: DictAddressEntry = {
  spoken: { call: "cháu", selfRef: GRANDPARENT_SELF_REF },
  formal: { call: "cháu", selfRef: GRANDPARENT_SELF_REF },
  reference: { call: "cháu ngoại", selfRef: GRANDPARENT_SELF_REF },
};

/** Miền Bắc. Birth order counts from 1 (anh cả). */
export const BAC: RegionProfile = {
  code: "BAC",
  region: "BAC",
  birthOrderOffset: 0,
  entries: {
    F: { spoken: { call: "bố", selfRef: "con" }, formal: { call: "cha", selfRef: "con" }, reference: { call: "bố", selfRef: "con" } },
    M: { spoken: { call: "mẹ", selfRef: "con" }, formal: { call: "mẹ", selfRef: "con" }, reference: { call: "mẹ", selfRef: "con" } },
    FF: { spoken: { call: "ông nội", selfRef: "cháu" }, formal: { call: "nội tổ", selfRef: "cháu" }, reference: { call: "ông nội", selfRef: "cháu" } },
    FM: { spoken: { call: "bà nội", selfRef: "cháu" }, formal: { call: "nội tổ", selfRef: "cháu" }, reference: { call: "bà nội", selfRef: "cháu" } },
    MF: { spoken: { call: "ông ngoại", selfRef: "cháu" }, formal: { call: "ngoại tổ", selfRef: "cháu" }, reference: { call: "ông ngoại", selfRef: "cháu" } },
    MM: { spoken: { call: "bà ngoại", selfRef: "cháu" }, formal: { call: "ngoại tổ", selfRef: "cháu" }, reference: { call: "bà ngoại", selfRef: "cháu" } },
    FeB: { spoken: { call: "bác", selfRef: "cháu" }, formal: { call: "bác", selfRef: "cháu" }, reference: { call: "bác", selfRef: "cháu" } },
    FyB: { spoken: { call: "chú", selfRef: "cháu" }, formal: { call: "chú", selfRef: "cháu" }, reference: { call: "chú", selfRef: "cháu" } },
    FeBW: { spoken: { call: "bác", selfRef: "cháu" }, formal: { call: "bác", selfRef: "cháu" }, reference: { call: "bác dâu", selfRef: "cháu" } },
    FyBW: { spoken: { call: "thím", selfRef: "cháu" }, formal: { call: "thím", selfRef: "cháu" }, reference: { call: "thím", selfRef: "cháu" } },
    FeZ: { spoken: { call: "bác", selfRef: "cháu" }, formal: { call: "bác", selfRef: "cháu" }, reference: { call: "bác gái", selfRef: "cháu" } },
    FyZ: { spoken: { call: "cô", selfRef: "cháu" }, formal: { call: "cô", selfRef: "cháu" }, reference: { call: "cô", selfRef: "cháu" } },
    FeZH: { spoken: { call: "dượng", selfRef: "cháu" }, formal: { call: "dượng", selfRef: "cháu" }, reference: { call: "dượng", selfRef: "cháu" } },
    FyZH: { spoken: { call: "dượng", selfRef: "cháu" }, formal: { call: "dượng", selfRef: "cháu" }, reference: { call: "dượng", selfRef: "cháu" } },
    MB: { spoken: { call: "cậu", selfRef: "cháu" }, formal: { call: "cậu", selfRef: "cháu" }, reference: { call: "cậu", selfRef: "cháu" } },
    MZ: { spoken: { call: "dì", selfRef: "cháu" }, formal: { call: "dì", selfRef: "cháu" }, reference: { call: "dì", selfRef: "cháu" } },
    MBW: { spoken: { call: "mợ", selfRef: "cháu" }, formal: { call: "mợ", selfRef: "cháu" }, reference: { call: "mợ", selfRef: "cháu" } },
    MZH: { spoken: { call: "dượng", selfRef: "cháu" }, formal: { call: "dượng", selfRef: "cháu" }, reference: { call: "dượng", selfRef: "cháu" } },
    H: { spoken: { call: "anh", selfRef: "em" }, formal: { call: "phu quân", selfRef: "em" }, reference: { call: "chồng", selfRef: "em" } },
    W: { spoken: { call: "em", selfRef: "anh" }, formal: { call: "phu nhân", selfRef: "anh" }, reference: { call: "vợ", selfRef: "anh" } },
    WF: { spoken: { call: "bố", selfRef: "con" }, formal: { call: "nhạc phụ", selfRef: "con rể" }, reference: { call: "bố vợ", selfRef: "con rể" } },
    WM: { spoken: { call: "mẹ", selfRef: "con" }, formal: { call: "nhạc mẫu", selfRef: "con rể" }, reference: { call: "mẹ vợ", selfRef: "con rể" } },
    HF: { spoken: { call: "bố", selfRef: "con" }, formal: { call: "nhạc phụ", selfRef: "con dâu" }, reference: { call: "bố chồng", selfRef: "con dâu" } },
    HM: { spoken: { call: "mẹ", selfRef: "con" }, formal: { call: "nhạc mẫu", selfRef: "con dâu" }, reference: { call: "mẹ chồng", selfRef: "con dâu" } },
    eB: { spoken: { call: "anh", selfRef: "em" }, formal: { call: "anh", selfRef: "em" }, reference: { call: "anh", selfRef: "em" } },
    eZ: { spoken: { call: "chị", selfRef: "em" }, formal: { call: "chị", selfRef: "em" }, reference: { call: "chị", selfRef: "em" } },
    yB: { spoken: { call: "em", selfRef: SIBLING_SELF_REF }, formal: { call: "em", selfRef: SIBLING_SELF_REF }, reference: { call: "em trai", selfRef: SIBLING_SELF_REF } },
    yZ: { spoken: { call: "em", selfRef: SIBLING_SELF_REF }, formal: { call: "em", selfRef: SIBLING_SELF_REF }, reference: { call: "em gái", selfRef: SIBLING_SELF_REF } },
    S: { spoken: { call: "con", selfRef: PARENT_SELF_REF }, formal: { call: "con trai", selfRef: PARENT_SELF_REF }, reference: { call: "con trai", selfRef: PARENT_SELF_REF } },
    D: { spoken: { call: "con", selfRef: PARENT_SELF_REF }, formal: { call: "con gái", selfRef: PARENT_SELF_REF }, reference: { call: "con gái", selfRef: PARENT_SELF_REF } },
    SW: { spoken: { call: "con", selfRef: PARENT_SELF_REF }, formal: { call: "con dâu", selfRef: PARENT_SELF_REF }, reference: { call: "con dâu", selfRef: PARENT_SELF_REF } },
    DH: { spoken: { call: "con", selfRef: PARENT_SELF_REF }, formal: { call: "con rể", selfRef: PARENT_SELF_REF }, reference: { call: "con rể", selfRef: PARENT_SELF_REF } },
    SS: CHAU_NOI,
    SD: CHAU_NOI,
    DS: CHAU_NGOAI,
    DD: CHAU_NGOAI,
  },
};
