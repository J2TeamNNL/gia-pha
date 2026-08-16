import { decodeAnsel } from "./ansel";
import type { GedcomEncoding } from "./types";

export interface DecodedGedcom {
  text: string;
  encoding: GedcomEncoding;
}

const UTF8_BOM = [0xef, 0xbb, 0xbf];
const UTF16LE_BOM = [0xff, 0xfe];
const UTF16BE_BOM = [0xfe, 0xff];

function hasBom(bytes: Uint8Array, bom: number[]): boolean {
  return bom.every((byte, index) => bytes[index] === byte);
}

/**
 * BOM-sniffs UTF-8/UTF-16; otherwise decodes as UTF-8 to read the HEAD.CHAR
 * tag and, if it declares ANSEL, redecodes the original bytes through the
 * ANSEL table instead.
 */
export function decodeGedcomBytes(bytes: Uint8Array): DecodedGedcom {
  if (hasBom(bytes, UTF8_BOM)) {
    return { text: new TextDecoder("utf-8").decode(bytes.subarray(3)), encoding: "UTF-8" };
  }
  if (hasBom(bytes, UTF16LE_BOM)) {
    return { text: new TextDecoder("utf-16le").decode(bytes.subarray(2)), encoding: "UTF-16LE" };
  }
  if (hasBom(bytes, UTF16BE_BOM)) {
    return { text: new TextDecoder("utf-16be").decode(bytes.subarray(2)), encoding: "UTF-16BE" };
  }

  const utf8Guess = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const declaredCharset = /^\s*1\s+CHAR\s+(\S+)/m.exec(utf8Guess)?.[1]?.toUpperCase();
  if (declaredCharset === "ANSEL") {
    return { text: decodeAnsel(bytes), encoding: "ANSEL" };
  }
  return { text: utf8Guess, encoding: declaredCharset === "ASCII" ? "ASCII" : "UTF-8" };
}
