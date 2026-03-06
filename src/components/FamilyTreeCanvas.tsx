"use client";

import { useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users } from "lucide-react";
import { useTreeStore } from "@/store/treeStore";
import { useTranslation } from "@/i18n/useTranslation";
import { getAllPersons, getAllRelationships } from "@/db/persons";
import { PersonCard } from "@/components/PersonCard";
import { cn } from "@/lib/utils";

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
  const constraintsRef = useRef<HTMLDivElement>(null);
  const t = useTranslation();

  const anchorPerson = persons.find((p) => p.is_anchor);
  const otherPersons = persons.filter((p) => !p.is_anchor);

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
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 bg-stone-50/50 bg-[radial-gradient(circle,_#80808012_1px,_transparent_1px)] bg-[size:24px_24px]">
        <div className="relative">
          <div className="absolute -inset-8 rounded-full bg-stone-200/40 animate-pulse blur-xl" />
          <div className="absolute -inset-4 rounded-full bg-stone-200/60 animate-pulse" />
          <span className="relative text-7xl drop-shadow-sm">🌳</span>
        </div>
        <div className="text-center max-w-md z-10">
          <h2 className="text-2xl font-serif text-stone-800 mb-3 tracking-tight">
            {t.canvas.emptyTitle}
          </h2>
          <p className="text-stone-500">{t.canvas.emptyDesc}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => openForm("quick")}
          className="relative z-10 flex items-center gap-2 bg-stone-800 text-white px-6 py-3 rounded-full text-sm font-medium shadow-xl shadow-stone-800/20 hover:bg-stone-700 transition-colors"
        >
          <Plus className="size-4" />
          {t.canvas.addFirst}
        </motion.button>
      </div>
    );
  }

  return (
    <div
      ref={constraintsRef}
      className="flex-1 relative overflow-hidden bg-stone-50/40 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] cursor-grab active:cursor-grabbing"
    >
      <div className="absolute top-5 left-5 z-20 flex items-center gap-3 bg-white/80 backdrop-blur-md border border-stone-200/60 rounded-full px-5 py-2.5 shadow-sm text-sm text-stone-700 font-medium">
        <Users className="size-4 text-stone-400" />
        <span>
          <strong className="text-stone-900">{persons.length}</strong>{" "}
          {t.canvas.membersCount}
        </span>
        {relationships.length > 0 && (
          <>
            <span className="w-1 h-1 rounded-full bg-stone-300" />
            <span className="text-stone-500">
              {relationships.length} {t.canvas.relationships}
            </span>
          </>
        )}
      </div>

      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
        className="w-[4000px] h-[4000px] absolute top-1/2 left-1/2 -mt-[2000px] -ml-[2000px] flex items-center justify-center pointer-events-auto"
      >
        <div className="flex flex-col items-center pointer-events-auto">
          {/* ANCHOR PERSON (ROOT) */}
          {anchorPerson && (
            <div className="relative">
              <motion.div
                layoutId={anchorPerson.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
              >
                <PersonCard
                  person={anchorPerson}
                  isSelected={selectedPersonId === anchorPerson.id}
                  onClick={() =>
                    selectPerson(
                      anchorPerson.id === selectedPersonId
                        ? null
                        : anchorPerson.id,
                    )
                  }
                  onAddRelative={(direction) => {
                    const relMap: Record<
                      string,
                      "parent" | "child" | "spouse" | "sibling"
                    > = {
                      top: "parent",
                      bottom: "child",
                      left: "sibling",
                      right: "spouse",
                    };
                    openForm("quick", {
                      targetId: anchorPerson.id,
                      relType: relMap[direction],
                    });
                  }}
                />
              </motion.div>

              {/* Vertical line dropping from Anchor */}
              {otherPersons.length > 0 && (
                <div className="absolute top-full left-1/2 w-0.5 h-16 bg-stone-300/70" />
              )}
            </div>
          )}

          {/* OTHER PERSONS (BRANCHES) */}
          {otherPersons.length > 0 && (
            <div className="flex justify-center gap-12 mt-16 relative">
              <AnimatePresence>
                {otherPersons.map((person, i) => (
                  <div key={person.id} className="relative">
                    {/* Horizontal connector lines */}
                    {otherPersons.length > 1 && (
                      <div
                        className={cn(
                          "absolute -top-16 h-8 border-t-[2px] border-stone-300/70",
                          i === 0
                            ? "left-1/2 right-0"
                            : i === otherPersons.length - 1
                              ? "right-1/2 left-0"
                              : "left-0 right-0",
                        )}
                      />
                    )}

                    {/* Vertical drop line to this specific card */}
                    <div className="absolute -top-16 left-1/2 w-0.5 h-16 bg-stone-300/70" />

                    <motion.div
                      layoutId={person.id}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -20 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 24,
                        delay: i * 0.05,
                      }}
                    >
                      <PersonCard
                        person={person}
                        isSelected={selectedPersonId === person.id}
                        onClick={() =>
                          selectPerson(
                            person.id === selectedPersonId ? null : person.id,
                          )
                        }
                        onAddRelative={(direction) => {
                          const relMap: Record<
                            string,
                            "parent" | "child" | "spouse" | "sibling"
                          > = {
                            top: "parent",
                            bottom: "child",
                            left: "sibling",
                            right: "spouse",
                          };
                          openForm("quick", {
                            targetId: person.id,
                            relType: relMap[direction],
                          });
                        }}
                      />
                    </motion.div>
                  </div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
