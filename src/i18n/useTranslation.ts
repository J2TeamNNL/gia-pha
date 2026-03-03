"use client";
import { useTreeStore } from "@/store/treeStore";
import { getDictionary } from "@/i18n";

/**
 * Simple translation hook — returns the dictionary for the current locale.
 * Usage: const t = useTranslation();  then  t.form.lastName
 */
export function useTranslation() {
  const locale = useTreeStore((s) => s.locale);
  return getDictionary(locale);
}
