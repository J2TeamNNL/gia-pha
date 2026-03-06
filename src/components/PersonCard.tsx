"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Person } from "@/db/types";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface PersonCardProps {
  person: Person;
  isSelected?: boolean;
  onClick?: () => void;
  onAddRelative?: (direction: "top" | "bottom" | "left" | "right") => void;
}

function getInitials(person: Person) {
  const first = (person.first_name?.[0] ?? "").toUpperCase();
  const last = (person.last_name?.[0] ?? "").toUpperCase();
  return last ? `${last}${first}` : first;
}

function getDisplayName(person: Person) {
  const parts = [
    person.last_name,
    person.middle_name,
    person.first_name,
  ].filter(Boolean);
  return parts.join(" ");
}

export function PersonCard({
  person,
  isSelected,
  onClick,
  onAddRelative,
}: PersonCardProps) {
  const isMale = person.gender === "MALE";
  const avatarBg = isMale
    ? "from-blue-400 to-blue-600"
    : "from-rose-400 to-rose-600";

  // Prevent button clicks from propagating to the main card click
  const handleAddClick = (
    e: React.MouseEvent,
    direction: "top" | "bottom" | "left" | "right",
  ) => {
    e.stopPropagation();
    onAddRelative?.(direction);
  };

  return (
    <div className="relative group">
      <motion.button
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={cn(
          "relative w-40 flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all cursor-pointer shadow-sm backdrop-blur-xl",
          isSelected
            ? "bg-white border-stone-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-stone-800"
            : "bg-white/80 border-stone-200/60 hover:border-stone-400/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:bg-white",
        )}
      >
        {/* Decorative background glow for selected */}
        {isSelected && (
          <div className="absolute inset-0 bg-stone-100 dark:bg-stone-800/5 rounded-3xl -z-10 animate-in fade-in duration-300" />
        )}

        {/* Avatar */}
        <div className="relative">
          <div
            className={cn(
              "size-16 rounded-full flex items-center justify-center text-white font-bold text-xl bg-gradient-to-br shadow-inner ring-2 ring-white",
              avatarBg,
              isSelected ? "ring-offset-2 ring-offset-stone-50" : "",
            )}
          >
            {person.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={person.avatar_url}
                alt={getDisplayName(person)}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span>{getInitials(person)}</span>
            )}
          </div>

          {/* Status Indicator */}
          {!person.is_living && (
            <div
              className="absolute -bottom-1 -right-1 bg-stone-600 border-2 border-white rounded-full size-4 flex items-center justify-center"
              title="Đã qua đời"
            >
              <div className="w-1.5 h-0.5 bg-white rounded-full transform rotate-45" />
            </div>
          )}
        </div>

        {/* Name and Details */}
        <div className="w-full text-center space-y-0.5">
          <p className="text-sm font-bold text-stone-800 leading-tight">
            {getDisplayName(person)}
          </p>

          {person.title_prefix && (
            <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wide">
              {person.title_prefix}
            </p>
          )}

          {person.birth_year && (
            <p className="text-[10px] text-stone-400 mt-1 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-200" />
              {person.birth_year}{" "}
              {person.death_year && `- ${person.death_year}`}
            </p>
          )}
        </div>
      </motion.button>

      {/* Floating Add Buttons (visible on hover or focus) */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Top: Parents */}
            <button
              onClick={(e) => handleAddClick(e, "top")}
              title="Thêm cha mẹ"
              className="absolute -top-4 left-1/2 -translate-x-1/2 pointer-events-auto size-8 bg-stone-800 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-stone-700 hover:scale-110 active:scale-95 transition-all z-10"
            >
              <Plus className="size-4" />
            </button>

            {/* Bottom: Children */}
            <button
              onClick={(e) => handleAddClick(e, "bottom")}
              title="Thêm con"
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto size-8 bg-stone-800 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-stone-700 hover:scale-110 active:scale-95 transition-all z-10"
            >
              <Plus className="size-4" />
            </button>

            {/* Right: Partner */}
            <button
              onClick={(e) => handleAddClick(e, "right")}
              title="Thêm vợ/chồng"
              className="absolute top-1/2 -right-4 -translate-y-1/2 pointer-events-auto size-8 bg-stone-800 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-stone-700 hover:scale-110 active:scale-95 transition-all z-10"
            >
              <Plus className="size-4" />
            </button>

            {/* Left: Sibling */}
            <button
              onClick={(e) => handleAddClick(e, "left")}
              title="Thêm anh chị em"
              className="absolute top-1/2 -left-4 -translate-y-1/2 pointer-events-auto size-8 bg-white border border-stone-200 text-stone-600 rounded-full flex items-center justify-center shadow-md hover:bg-stone-50 hover:scale-110 active:scale-95 transition-all z-10"
            >
              <Plus className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
