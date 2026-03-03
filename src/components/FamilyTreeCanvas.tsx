"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users } from "lucide-react";
import { useTreeStore } from "@/store/treeStore";
import { useTranslation } from "@/i18n/useTranslation";
import { getAllPersons, getAllRelationships } from "@/db/persons";
import { PersonCard } from "@/components/PersonCard";

export function FamilyTreeCanvas() {
  const {
    persons,
    relationships,
    setPersons,
    setRelationships,
    openForm,
    selectedPersonId,
    selectPerson,
  } = useTreeStore();
  const t = useTranslation();

  const loadData = useCallback(async () => {
    try {
      const [pList, rList] = await Promise.all([
        getAllPersons(),
        getAllRelationships(),
      ]);
      setPersons(pList);
      setRelationships(rList);
    } catch (err) {
      console.error("Failed to load family data:", err);
    }
  }, [setPersons, setRelationships]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (persons.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-stone-50">
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-stone-200/60 animate-pulse" />
          <span className="relative text-5xl">🌳</span>
        </div>
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-serif text-stone-600 mb-2">
            {t.canvas.emptyTitle}
          </h2>
          <p className="text-sm text-stone-500">{t.canvas.emptyDesc}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => openForm("quick")}
          className="flex items-center gap-2 bg-stone-800 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-lg hover:bg-stone-700 transition-colors"
        >
          <Plus className="size-4" />
          {t.canvas.addFirst}
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-auto bg-[radial-gradient(circle,_#e7e5e4_1px,_transparent_1px)] bg-[size:24px_24px] bg-stone-50">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-stone-200 rounded-full px-4 py-2 shadow-sm text-sm text-stone-600">
        <Users className="size-4" />
        <span>
          <strong>{persons.length}</strong> {t.canvas.membersCount}
        </span>
        {relationships.length > 0 && (
          <span className="text-stone-400">
            · {relationships.length} {t.canvas.relationships}
          </span>
        )}
      </div>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => openForm("quick")}
        className="absolute top-4 right-4 z-10 bg-stone-800 text-white rounded-full p-3 shadow-lg hover:bg-stone-700 transition-colors"
        title={t.header.addMember}
      >
        <Plus className="size-5" />
      </motion.button>

      <div className="p-8 pt-16">
        <AnimatePresence>
          <div className="flex flex-wrap gap-4">
            {persons.map((person) => (
              <motion.div
                key={person.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
              >
                <PersonCard
                  person={person}
                  isSelected={selectedPersonId === person.id}
                  onClick={() =>
                    selectPerson(
                      person.id === selectedPersonId ? null : person.id,
                    )
                  }
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
}
