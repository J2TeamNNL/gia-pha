"use client";

import { motion } from "framer-motion";
import type { Person } from "@/db/types";
import { cn } from "@/lib/utils";

interface PersonCardProps {
  person: Person;
  isSelected?: boolean;
  onClick?: () => void;
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

export function PersonCard({ person, isSelected, onClick }: PersonCardProps) {
  const isMale = person.gender === "MALE";
  const avatarBg = isMale
    ? "from-blue-400 to-blue-600"
    : "from-rose-400 to-rose-600";

  return (
    <motion.button
      whileHover={{ y: -3 }}
      onClick={onClick}
      className={cn(
        "w-32 flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all cursor-pointer bg-white shadow-sm",
        isSelected
          ? "border-stone-800 shadow-lg ring-2 ring-stone-800/20"
          : "border-stone-200 hover:border-stone-400 hover:shadow-md",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "size-14 rounded-full flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br shadow-inner",
          avatarBg,
        )}
      >
        {person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.avatar_url}
            alt={getDisplayName(person)}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <span>{getInitials(person)}</span>
        )}
      </div>

      {/* Name */}
      <div className="w-full">
        <p className="text-xs font-semibold text-stone-800 truncate max-w-full">
          {getDisplayName(person)}
        </p>
        {person.title_prefix && (
          <p className="text-[10px] text-stone-400">{person.title_prefix}</p>
        )}
        {!person.is_living && (
          <span className="inline-block mt-0.5 text-[9px] bg-stone-200 text-stone-500 px-1.5 rounded-full">
            Đã mất
          </span>
        )}
      </div>
    </motion.button>
  );
}
