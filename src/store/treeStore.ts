/**
 * Zustand Global Store
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type Person, type Relationship } from "@/db/types";
import type { Locale } from "@/i18n";

interface TreeState {
  persons: Person[];
  relationships: Relationship[];

  selectedPersonId: string | null;
  anchorPersonId: string | null;
  isFormOpen: boolean;
  formMode: "quick" | "full";
  formPreFill: {
    targetId: string;
    relType: "parent" | "child" | "spouse" | "sibling";
  } | null;
  isOnboarding: boolean;
  locale: Locale;

  frequentlyUsedFields: string[];

  setPersons: (persons: Person[]) => void;
  addPerson: (person: Person) => void;
  updatePerson: (id: string, updates: Partial<Person>) => void;
  deletePerson: (id: string) => void;
  setRelationships: (rels: Relationship[]) => void;
  addRelationship: (rel: Relationship) => void;
  selectPerson: (id: string | null) => void;
  openForm: (
    mode?: "quick" | "full",
    preFill?: {
      targetId: string;
      relType: "parent" | "child" | "spouse" | "sibling";
    },
  ) => void;
  closeForm: () => void;
  setAnchorPersonId: (id: string | null) => void;
  setLocale: (locale: Locale) => void;
  trackFieldUsage: (fieldName: string) => void;
}

export const useTreeStore = create<TreeState>()(
  persist(
    (set) => ({
      persons: [],
      relationships: [],
      selectedPersonId: null,
      anchorPersonId: null,
      isFormOpen: false,
      formPreFill: null,
      isOnboarding: true,
      formMode: "quick",
      locale: "vi",
      frequentlyUsedFields: [],

      setPersons: (persons) => set({ persons }),
      addPerson: (person) => set((s) => ({ persons: [...s.persons, person] })),
      updatePerson: (id, updates) =>
        set((s) => ({
          persons: s.persons.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),
      deletePerson: (id) =>
        set((s) => ({
          persons: s.persons.filter((p) => p.id !== id),
          relationships: s.relationships.filter(
            (r) => r.person_id !== id && r.related_to_id !== id,
          ),
          selectedPersonId:
            s.selectedPersonId === id ? null : s.selectedPersonId,
        })),

      setRelationships: (rels) => set({ relationships: rels }),
      addRelationship: (rel) =>
        set((s) => ({ relationships: [...s.relationships, rel] })),

      selectPerson: (id) => set({ selectedPersonId: id }),
      openForm: (mode = "quick", preFill) =>
        set({ isFormOpen: true, formMode: mode, formPreFill: preFill || null }),
      closeForm: () => set({ isFormOpen: false, formPreFill: null }),
      setAnchorPersonId: (id) =>
        set({ anchorPersonId: id, isOnboarding: false }),
      setLocale: (locale) => set({ locale }),

      trackFieldUsage: (fieldName) =>
        set((s) => ({
          frequentlyUsedFields: s.frequentlyUsedFields.includes(fieldName)
            ? s.frequentlyUsedFields
            : [...s.frequentlyUsedFields, fieldName],
        })),
    }),
    {
      name: "gia-pha-tree",
      partialize: (s) => ({
        frequentlyUsedFields: s.frequentlyUsedFields,
        anchorPersonId: s.anchorPersonId,
        isOnboarding: s.isOnboarding,
        locale: s.locale,
      }),
    },
  ),
);
