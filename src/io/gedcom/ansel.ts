/**
 * ANSEL (GEDCOM 5.5/5.5.1 default charset) special letters that are not
 * combining diacritics. Values are Unicode NFC codepoints.
 */
const ANSEL_SPECIAL: Record<number, string> = {
  0xa1: "Ł",
  0xa2: "Ø",
  0xa3: "Đ",
  0xa4: "Þ",
  0xa5: "Æ",
  0xa6: "Œ",
  0xac: "Ơ",
  0xad: "Ư",
  0xb1: "ł",
  0xb2: "ø",
  0xb3: "đ",
  0xb4: "þ",
  0xb5: "æ",
  0xb6: "œ",
  0xb8: "ı",
  0xba: "ð",
  0xbc: "ơ",
  0xbd: "ư",
  0xc5: "¿",
  0xc6: "¡",
};

/**
 * ANSEL combining diacritics, keyed by the byte that precedes the base
 * character in the source (the opposite order from Unicode combining marks).
 * Values are built from codepoints, not typed as literal characters, since
 * a bare combining mark is unreadable/unverifiable in source.
 */
const ANSEL_COMBINING: Record<number, number> = {
  0xe0: 0x0300, // grave
  0xe1: 0x0301, // acute
  0xe2: 0x0302, // circumflex
  0xe3: 0x0303, // tilde
  0xe4: 0x0304, // macron
  0xe5: 0x0306, // breve
  0xe6: 0x0307, // dot above
  0xe7: 0x0308, // diaeresis
  0xe8: 0x030c, // caron
  0xe9: 0x030a, // ring above
  0xed: 0x030b, // double acute
  0xef: 0x0327, // cedilla
  0xf1: 0x0328, // ogonek
  0xf2: 0x0323, // dot below
  0xf3: 0x0324, // double dot below
  0xf4: 0x0325, // ring below
  0xf6: 0x0332, // underscore
  0xf7: 0x0326, // comma below
  0xf9: 0x032e, // breve below
};

const COMBINING_MARK_START = 0x0300;
const COMBINING_MARK_END = 0x036f;

function isCombiningMark(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return code >= COMBINING_MARK_START && code <= COMBINING_MARK_END;
}

/** ANSEL stores a combining mark before its base character; Unicode requires the reverse. */
function reorderCombiningMarks(text: string): string {
  const chars = Array.from(text);
  const result: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const next = chars[i + 1];
    if (isCombiningMark(chars[i]) && next !== undefined && !isCombiningMark(next)) {
      result.push(next, chars[i]);
      i++;
    } else {
      result.push(chars[i]);
    }
  }
  return result.join("");
}

/**
 * Decodes ANSEL bytes to a Unicode string. Bytes with no known mapping fall
 * back to U+FFFD rather than guessing, so unmapped input stays visible.
 */
export function decodeAnsel(bytes: Uint8Array): string {
  let raw = "";
  for (const byte of bytes) {
    if (byte < 0x80) {
      raw += String.fromCharCode(byte);
    } else if (ANSEL_COMBINING[byte] !== undefined) {
      raw += String.fromCodePoint(ANSEL_COMBINING[byte]);
    } else if (ANSEL_SPECIAL[byte] !== undefined) {
      raw += ANSEL_SPECIAL[byte];
    } else {
      raw += String.fromCodePoint(0xfffd);
    }
  }
  return reorderCombiningMarks(raw).normalize("NFC");
}
