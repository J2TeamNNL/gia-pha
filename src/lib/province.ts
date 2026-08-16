import { normalizeName } from "./personName";

/**
 * Turns a typed province name into the code a dialect variant is keyed by, so
 * "Quảng Trị", "quang tri", and "QUẢNG TRỊ" all reach the same dictionary.
 */
export function provinceCode(name: string): string {
  return normalizeName(name).replace(/\s+/g, "_").toUpperCase();
}
