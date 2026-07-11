import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useTreeStore } from "@/store/treeStore";
import { useTranslation } from "@/i18n/useTranslation";
import { GraphView } from "@/components/GraphView";

/**
 * The primary canvas: an empty-state prompt until the first member exists,
 * then the interactive family graph. Person data is loaded by the workspace
 * (page) when the active tree changes.
 */
export function FamilyTreeCanvas() {
  const { persons, openForm } = useTreeStore();
  const t = useTranslation();

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

  return <GraphView />;
}
