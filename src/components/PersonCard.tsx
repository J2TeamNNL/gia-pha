"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Person } from "@/db/types";
import { isDeceased } from "@/lib/person-status";
import { cn } from "@/lib/utils";
import { Star, Users2, Heart, ChevronUp, ChevronDown } from "lucide-react";

/** Tôn trọng `prefers-reduced-motion` — tắt animation trang trí khi user đặt. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

interface PersonCardProps {
  person: Person;
  isSelected?: boolean;
  isAnchor?: boolean;
  /** Vai vế tính từ nhân vật trung tâm, vd: "Cha/Mẹ", "Con", "Anh/Chị/Em" */
  relationLabel?: string;
  onClick?: () => void;
  onAddRelative?: (direction: "top" | "bottom" | "left" | "right") => void;
  /** Cho phép đổi nhân vật trung tâm → người này */
  onSetAsAnchor?: () => void;
}

function getInitials(person: Person) {
  const first = (person.first_name?.[0] ?? "").toUpperCase();
  const last = (person.last_name?.[0] ?? "").toUpperCase();
  return last ? `${last}${first}` : first;
}

function getDisplayName(person: Person) {
  return [person.last_name, person.middle_name, person.first_name]
    .filter(Boolean)
    .join(" ");
}

function getLifeSpan(person: Person): string | null {
  const birth = person.birth_year;
  const death = person.death_year;
  if (!birth && !death) return null;
  if (isDeceased(person) && death) return `${birth ?? "?"} – ${death}`;
  return birth ? `Sinh ${birth}` : null;
}


const avatarGradient: Record<string, string> = {
  MALE: "from-blue-400 to-blue-600",
  FEMALE: "from-rose-400 to-rose-600",
  OTHER: "from-stone-400 to-stone-600",
};

// 4 nút thêm — khác màu để dễ phân biệt. size-11 (44px) = touch target tối
// thiểu cho người cao tuổi (trước: size-7 = 28px, dưới ngưỡng 44px, xem
// docs/tree-layout.md §10).
const ADD_BUTTONS = [
  {
    direction: "top" as const,
    title: "Thêm cha/mẹ",
    icon: ChevronUp,
    className: "absolute -top-6 left-1/2 -translate-x-1/2 size-11 rounded-full bg-stone-700 text-white flex items-center justify-center shadow-lg hover:bg-stone-500 active:scale-95 transition-all",
  },
  {
    direction: "bottom" as const,
    title: "Thêm con",
    icon: ChevronDown,
    className: "absolute -bottom-6 left-1/2 -translate-x-1/2 size-11 rounded-full bg-stone-700 text-white flex items-center justify-center shadow-lg hover:bg-stone-500 active:scale-95 transition-all",
  },
  {
    direction: "right" as const,
    title: "Thêm vợ/chồng",
    icon: Heart,
    className: "absolute top-1/2 -right-6 -translate-y-1/2 size-11 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg hover:bg-rose-400 active:scale-95 transition-all",
  },
  {
    direction: "left" as const,
    title: "Thêm anh/chị/em",
    icon: Users2,
    className: "absolute top-1/2 -left-6 -translate-y-1/2 size-11 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-lg hover:bg-teal-500 active:scale-95 transition-all",
  },
] as const;

export function PersonCard({
  person,
  isSelected,
  isAnchor,
  relationLabel,
  onClick,
  onAddRelative,
  onSetAsAnchor,
}: PersonCardProps) {
  const gradient = avatarGradient[person.gender] ?? avatarGradient.OTHER;
  const lifeSpan = getLifeSpan(person);
  // Ưu tiên: vai vế từ mối quan hệ → title_prefix tự nhập → không hiển thị
  const vaiVeLabel = relationLabel || person.title_prefix;
  const reducedMotion = usePrefersReducedMotion();

  const handleAddClick = (e: React.MouseEvent, dir: "top" | "bottom" | "left" | "right") => {
    e.stopPropagation();
    onAddRelative?.(dir);
  };

  return (
    <div className="relative group">
      <motion.button
        whileHover={reducedMotion ? undefined : { y: -2, scale: 1.015 }}
        whileTap={reducedMotion ? undefined : { scale: 0.98 }}
        onClick={onClick}
        className={cn(
          // Kích thước cố định — không giãn theo tên dài, không lệch hàng thế hệ.
          "relative flex flex-col items-center rounded-2xl border transition-all cursor-pointer shadow-sm overflow-hidden",
          "w-36 h-[124px]",
          isAnchor
            ? "bg-amber-50 border-amber-300 shadow-[0_0_0_2px_#fbbf24,0_6px_20px_rgb(251,191,36,0.18)]"
            : isSelected
              ? "bg-white border-stone-700 shadow-[0_6px_24px_rgb(0,0,0,0.12)] ring-1 ring-stone-700"
              : "bg-white/90 border-stone-200 hover:border-stone-300 hover:shadow-[0_4px_16px_rgb(0,0,0,0.08)] hover:bg-white",
        )}
      >
        {/* ── Vai vế header — luôn chiếm đúng 1 dòng cao cố định, dù rỗng,
             để không đổi tổng chiều cao card giữa có/không có nhãn ────── */}
        <div
          className={cn(
            "w-full h-5 shrink-0 px-2 flex items-center justify-center gap-1 text-[10px] font-bold tracking-wide text-center",
            // Chữ đậm trên nền vàng — trước: text-white ≈ 1.7:1 (fail), sau:
            // text-stone-900 ≈ 10.5:1 (pass ≥4.5:1). Xem docs/tree-layout.md §10.
            isAnchor
              ? "bg-amber-400/90 text-stone-900"
              : vaiVeLabel
                ? "bg-stone-700 text-white"
                : "bg-transparent",
          )}
        >
          {isAnchor && <Star className="size-2.5 fill-stone-900 shrink-0" />}
          {(isAnchor || vaiVeLabel) && (
            <span className="truncate">
              {isAnchor ? "Nhân vật trung tâm" : vaiVeLabel}
            </span>
          )}
        </div>

        {/* ── Avatar + Name + Info ────────────────────────────────── */}
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-3 w-full min-h-0">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className={cn(
                "size-12 rounded-full flex items-center justify-center text-white font-bold text-base bg-gradient-to-br ring-2 ring-white shadow",
                gradient,
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
            {isDeceased(person) && (
              <div
                title="Đã qua đời"
                className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-stone-600 border-2 border-white flex items-center justify-center"
              >
                <span className="text-white text-[8px] font-bold leading-none">✝</span>
              </div>
            )}
          </div>

          {/* Tên — 1 dòng, dài thì truncate, không bao giờ đẩy card cao thêm */}
          <p className="text-[11px] font-bold text-stone-800 leading-snug text-center w-full truncate shrink-0">
            {getDisplayName(person)}
          </p>

          {/* Năm sinh/mất — luôn chiếm đúng 1 dòng để chiều cao ổn định.
              Trước: text-stone-400 ≈ 2.5:1 (fail), sau: text-stone-500 ≈
              4.8:1 (pass ≥4.5:1). Xem docs/tree-layout.md §10. */}
          <p className="text-[9px] text-stone-500 font-medium h-3 shrink-0">
            {lifeSpan ?? ""}
          </p>
        </div>
      </motion.button>

      {/* Nút đổi anchor — trước: opacity-0 + focus được (bẫy focus vô
          hình), size-5 (20px, dưới ngưỡng 44px). Sau: hiện khi hover HOẶC
          focus bàn phím, size-11 (44px). Xem docs/tree-layout.md §10. */}
      {!isAnchor && onSetAsAnchor && (
        <button
          onClick={(e) => { e.stopPropagation(); onSetAsAnchor(); }}
          title="Đặt làm nhân vật trung tâm"
          aria-label="Đặt làm nhân vật trung tâm"
          className="absolute -top-4 -right-4 size-11 bg-stone-200 text-stone-500 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:!bg-amber-400 hover:!text-stone-900 transition-all z-10"
        >
          <Star className="size-3" />
        </button>
      )}

      {/* 4 nút thêm thành viên */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : undefined}
            className="absolute inset-0 pointer-events-none"
          >
            {ADD_BUTTONS.map(({ direction, title, icon: Icon, className }) => (
              <button
                key={direction}
                onClick={(e) => handleAddClick(e, direction)}
                title={title}
                className={cn(className, "pointer-events-auto")}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
