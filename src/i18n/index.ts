import { vi } from "./vi";
import { en } from "./en";

export type Locale = "vi" | "en";

export const dictionaries = { vi, en } as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
