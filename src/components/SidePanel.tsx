"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useTreeStore } from "@/store/treeStore";
import { useTranslation } from "@/i18n/useTranslation";
import { QuickAddForm } from "./QuickAddForm";
import { cn } from "@/lib/utils";
import { lifeStatus } from "@/lib/person-status";

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

export function SidePanel() {
  const {
    isFormOpen,
    closeForm,
    selectedPersonId,
    selectPerson,
    persons,
    locale,
  } = useTreeStore();
  const t = useTranslation();
  const selectedPerson = persons.find((p) => p.id === selectedPersonId);
  const showPanel = isFormOpen || !!selectedPerson;
  const reducedMotion = usePrefersReducedMotion();

  return (
    <AnimatePresence>
      {showPanel && (
        <motion.aside
          key="panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 300, damping: 30 }
          }
          className="absolute inset-y-0 right-0 z-40 sm:relative w-full sm:w-80 lg:w-96 bg-white border-l border-stone-200 shadow-xl flex flex-col overflow-y-auto"
        >
          <div className="p-5 flex-1">
            {isFormOpen ? (
              <QuickAddForm onClose={closeForm} />
            ) : selectedPerson ? (
              <div className="space-y-4 relative">
                {/* Trước: p-1.5 + size-4 icon ≈ 28px (dưới ngưỡng 44px),
                    không tên (không title/aria-label). Sau: size-11 (44px),
                    aria-label. Xem docs/tree-layout.md §10. */}
                <button
                  onClick={() => selectPerson(null)}
                  title={locale === "vi" ? "Đóng" : "Close"}
                  aria-label={locale === "vi" ? "Đóng" : "Close"}
                  className="absolute -top-1 -right-1 size-11 flex items-center justify-center text-stone-400 hover:text-stone-600 bg-stone-50 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X className="size-4" />
                </button>
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100 pr-12">
                  <div
                    className={cn(
                      "size-14 rounded-full flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br shadow-inner",
                      selectedPerson.gender === "MALE"
                        ? "from-blue-400 to-blue-600"
                        : "from-rose-400 to-rose-600",
                    )}
                  >
                    {(
                      (selectedPerson.last_name?.[0] ?? "") +
                      (selectedPerson.first_name?.[0] ?? "")
                    ).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-800">
                      {[
                        selectedPerson.last_name,
                        selectedPerson.middle_name,
                        selectedPerson.first_name,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </h3>
                    {selectedPerson.title_prefix && (
                      <p className="text-sm text-stone-400">
                        {selectedPerson.title_prefix}
                      </p>
                    )}
                    {/* Ba trạng thái, không hai. "Chưa rõ" là câu trả lời hợp
                        lệ với tổ tiên xa — xem src/lib/person-status.ts */}
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        {
                          living: "bg-green-100 text-green-800",
                          deceased: "bg-stone-200 text-stone-700",
                          unknown: "bg-amber-100 text-amber-800",
                        }[lifeStatus(selectedPerson)],
                      )}
                    >
                      {
                        {
                          living: t.profile.alive,
                          deceased: t.profile.deceased,
                          unknown: t.profile.statusUnknown,
                        }[lifeStatus(selectedPerson)]
                      }
                    </span>
                    {selectedPerson.is_anchor && (
                      <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        ⭐ {locale === "vi" ? "Bản thân" : "You"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  {selectedPerson.phone_number && (
                    <Row
                      label={t.profile.phone}
                      value={selectedPerson.phone_number}
                    />
                  )}
                  {selectedPerson.contact_address && (
                    <Row
                      label={t.profile.address}
                      value={selectedPerson.contact_address}
                    />
                  )}
                  {selectedPerson.fb_link && (
                    <Row
                      label={t.profile.facebook}
                      value={selectedPerson.fb_link}
                      isLink
                    />
                  )}
                  {selectedPerson.notes && (
                    <Row label={t.profile.note} value={selectedPerson.notes} />
                  )}
                  {selectedPerson.biography && (
                    <Row
                      label={t.profile.biography}
                      value={selectedPerson.biography}
                    />
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Row({
  label,
  value,
  isLink,
}: {
  label: string;
  value: string;
  isLink?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <span className="text-stone-400 min-w-0 shrink-0 text-xs pt-0.5">
        {label}
      </span>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline truncate text-xs"
        >
          {value}
        </a>
      ) : (
        <span className="text-stone-700 text-xs">{value}</span>
      )}
    </div>
  );
}
