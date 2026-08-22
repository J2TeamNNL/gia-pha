"use client";

import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, AlertTriangle, ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { useTreeStore } from "@/store/treeStore";
import { useTranslation } from "@/i18n/useTranslation";
import { getAllPersons, getAllRelationships, setAnchorPerson } from "@/db/persons";
import { PersonCard } from "@/components/PersonCard";
import { computeTreeLayout, type ConnectorKind } from "@/lib/tree-layout";
import type { Person, Relationship } from "@/db/types";

const CONNECTOR_STYLE: Record<ConnectorKind, { stroke: string; dash?: string }> = {
  "parent-child": { stroke: "#d6d3d1" }, // stone-300
  spouse: { stroke: "#fecdd3" }, // rose-200, nét liền
  "ex-spouse": { stroke: "#fda4af", dash: "6 4" }, // rose-300, nét đứt — khác SPOUSE
};

// ─── Viewport: pan / zoom / fit — thay cho motion.div drag (drag làm mất
// pinch-to-zoom, không hỗ trợ arrow-key, không phân biệt tap/pan) ──────────
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
/** Nửa kích thước "vùng chạm" mỗi card, TÍNH CẢ 4 nút thêm/nút đổi anchor
 * nhô ra ngoài — dùng để tính bounding box khi "fit". Card thật w-36 h-[124px]. */
const CARD_HALF_W = 100;
const CARD_HALF_H = 90;
const ARROW_PAN_STEP = 80;

interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}

const IDENTITY_TRANSFORM: ViewportTransform = { x: 0, y: 0, scale: 1 };

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

// ─── Vai vế relative to anchor — gender-specific ────────────────────────────
function getRelationLabel(
  person: Person,
  anchor: Person,
  relationships: Relationship[],
): string | undefined {
  if (person.id === anchor.id) return undefined;
  const isMale = person.gender === "MALE";

  for (const r of relationships) {
    if (r.rel_type === "PARENT_OF") {
      if (r.person_id === person.id && r.related_to_id === anchor.id) return isMale ? "Cha" : "Mẹ";
      if (r.person_id === anchor.id && r.related_to_id === person.id) return isMale ? "Con trai" : "Con gái";
    }
    if (r.rel_type === "SPOUSE" || r.rel_type === "EX_SPOUSE") {
      const isMatch =
        (r.person_id === person.id && r.related_to_id === anchor.id) ||
        (r.person_id === anchor.id && r.related_to_id === person.id);
      if (isMatch) {
        if (r.rel_type === "EX_SPOUSE") return isMale ? "Chồng (cũ)" : "Vợ (cũ)";
        return isMale ? "Chồng" : "Vợ";
      }
    }
  }

  const anchorParents = relationships
    .filter((r) => r.rel_type === "PARENT_OF" && r.related_to_id === anchor.id)
    .map((r) => r.person_id);
  const personParents = relationships
    .filter((r) => r.rel_type === "PARENT_OF" && r.related_to_id === person.id)
    .map((r) => r.person_id);

  if (anchorParents.some((p) => personParents.includes(p))) {
    const pYear = person.birth_year ?? 9999;
    const aYear = anchor.birth_year ?? 9999;
    if (pYear < aYear) return isMale ? "Anh" : "Chị";
    if (pYear > aYear) return isMale ? "Em trai" : "Em gái";
    return isMale ? "Anh" : "Chị";
  }

  const anchorParentSet = new Set(anchorParents);
  for (const r of relationships) {
    if (r.rel_type === "PARENT_OF" && r.person_id === person.id && anchorParentSet.has(r.related_to_id))
      return isMale ? "Ông" : "Bà";
  }

  const anchorChildren = relationships
    .filter((r) => r.rel_type === "PARENT_OF" && r.person_id === anchor.id)
    .map((r) => r.related_to_id);
  const anchorChildSet = new Set(anchorChildren);
  for (const r of relationships) {
    if (r.rel_type === "PARENT_OF" && anchorChildSet.has(r.person_id) && r.related_to_id === person.id)
      return isMale ? "Cháu trai" : "Cháu gái";
  }

  // Mở rộng Cô, Dì, Chú, Bác (Anh chị em của Cha Mẹ)
  const grandparents = relationships
    .filter((r) => r.rel_type === "PARENT_OF" && anchorParentSet.has(r.related_to_id))
    .map((r) => r.person_id);
  const grandparentSet = new Set(grandparents);
  if (grandparentSet.size > 0) {
    for (const r of relationships) {
       if (r.rel_type === "PARENT_OF" && grandparentSet.has(r.person_id) && r.related_to_id === person.id && !anchorParentSet.has(person.id)) {
           return isMale ? "Bác/Chú/Cậu" : "Bác/Cô/Dì";
       }
    }
  }

  return undefined;
}

// ─── PersonCard wrapper ───────────────────────────────────────────────────────
function NodeCell({
  person,
  anchor,
  selectedId,
  relationships,
  onSelect,
  onSetAnchor,
  onAdd,
  delay = 0,
}: {
  person: Person;
  anchor: Person | null;
  selectedId: string | null;
  relationships: Relationship[];
  onSelect: (id: string) => void;
  onSetAnchor: (id: string) => void;
  onAdd: (id: string, dir: "top" | "bottom" | "left" | "right") => void;
  delay?: number;
}) {
  const label = anchor ? getRelationLabel(person, anchor, relationships) : undefined;
  return (
    <motion.div
      layoutId={person.id}
      initial={{ opacity: 0, scale: 0.88, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay }}
    >
      <PersonCard
        person={person}
        isAnchor={person.id === anchor?.id}
        isSelected={selectedId === person.id}
        relationLabel={label}
        onClick={() => onSelect(person.id)}
        onSetAsAnchor={() => onSetAnchor(person.id)}
        onAddRelative={(dir) => onAdd(person.id, dir)}
      />
    </motion.div>
  );
}

// ─── Main Canvas ─────────────────────────────────────────────────────────────
export function FamilyTreeCanvas() {
  const { persons, relationships, setPersons, setRelationships, openForm, selectedPersonId, selectPerson, updatePerson } =
    useTreeStore();
  const t = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [pList, rList] = await Promise.all([getAllPersons(), getAllRelationships()]);
      setPersons(pList);
      setRelationships(rList);
      setLoadError(null);
    } catch (err) {
      // Lỗi đọc storage (StorageUnreadableError / SchemaTooNewError /
      // SchemaMigrationError) KHÔNG BAO GIỜ được hiểu là "cây rỗng" — nếu không,
      // người dùng sẽ nhập lại từ đầu và ghi đè lên cây thật vẫn còn trên đĩa.
      console.error("Lỗi tải dữ liệu:", err);
      setLoadError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [setPersons, setRelationships]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSetAnchor = useCallback(
    async (newId: string) => {
      await setAnchorPerson(newId);
      persons.forEach((p) => { if (p.is_anchor) updatePerson(p.id, { is_anchor: false }); });
      updatePerson(newId, { is_anchor: true });
    },
    [persons, updatePerson],
  );

  const handleAdd = useCallback(
    (targetId: string, dir: "top" | "bottom" | "left" | "right") => {
      const relMap: Record<string, "parent" | "child" | "spouse" | "sibling"> = {
        top: "parent", bottom: "child", left: "sibling", right: "spouse",
      };
      openForm("quick", { targetId, relType: relMap[dir] });
    },
    [openForm],
  );

  const handleSelect = useCallback(
    (id: string) => selectPerson(id === selectedPersonId ? null : id),
    [selectPerson, selectedPersonId],
  );

  const anchor = persons.find((p) => p.is_anchor) ?? null;

  // Layout hình học — HÀM THUẦN (src/lib/tree-layout.ts). Tính toạ độ (x,y) theo
  // đời tuyệt đối + reserve chiều rộng subtree, và danh sách connector đã gộp
  // thành tối đa 3 <path> (cha-con / vợ-chồng / vợ-chồng-cũ).
  const layout = useMemo(
    () => computeTreeLayout(persons, relationships, anchor?.id ?? null),
    [persons, relationships, anchor],
  );
  const nodeById = useMemo(
    () => new Map(layout.nodes.map((n) => [n.id, n])),
    [layout.nodes],
  );

  // ── Viewport: pan/zoom state — CSS transform(translate, scale) áp lên div
  // chứa toạ độ gốc (đã căn giữa container bằng top-1/2 left-1/2). ─────────
  const containerElRef = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState<ViewportTransform>(IDENTITY_TRANSFORM);
  const hasAutoFitRef = useRef(false);

  const pan = useCallback((dx: number, dy: number) => {
    setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
  }, []);

  /** Zoom quanh điểm (px, py) — TOẠ ĐỘ MÀN HÌNH tương đối gốc container —
   * điểm đó không dịch chuyển sau khi đổi scale (giữ điểm neo). */
  const zoomAt = useCallback((px: number, py: number, factor: number) => {
    setTransform((t) => {
      const newScale = clampScale(t.scale * factor);
      const ratio = newScale / t.scale;
      return { scale: newScale, x: px - (px - t.x) * ratio, y: py - (py - t.y) * ratio };
    });
  }, []);

  const resetView = useCallback(() => setTransform(IDENTITY_TRANSFORM), []);

  /** Đưa TOÀN BỘ node (mọi component của rừng, không riêng nhánh anchor)
   * vào khung nhìn hiện tại, căn giữa, scale vừa đủ (có padding 10%). */
  const fitToView = useCallback(() => {
    const el = containerElRef.current;
    if (!el || layout.nodes.length === 0) return;
    const rect = el.getBoundingClientRect();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of layout.nodes) {
      minX = Math.min(minX, n.x - CARD_HALF_W);
      maxX = Math.max(maxX, n.x + CARD_HALF_W);
      minY = Math.min(minY, n.y - CARD_HALF_H);
      maxY = Math.max(maxY, n.y + CARD_HALF_H);
    }
    const bboxW = Math.max(1, maxX - minX);
    const bboxH = Math.max(1, maxY - minY);
    const scale = clampScale(Math.min((rect.width * 0.9) / bboxW, (rect.height * 0.9) / bboxH));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setTransform({
      scale,
      x: rect.width / 2 - scale * (rect.width / 2 + centerX),
      y: rect.height / 2 - scale * (rect.height / 2 + centerY),
    });
  }, [layout.nodes]);

  // Lần đầu có dữ liệu — tự "fit" một lần để anchor + cây không bị cắt ngoài
  // khung (đo được ở màn 390×844: anchor cách gốc 360px, sát đáy). Chỉ chạy
  // một lần, không ghi đè pan/zoom user đã tự chỉnh sau đó.
  useEffect(() => {
    if (!hasAutoFitRef.current && layout.nodes.length > 0 && containerElRef.current) {
      fitToView();
      hasAutoFitRef.current = true;
    }
  }, [layout.nodes.length, fitToView]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp": e.preventDefault(); pan(0, ARROW_PAN_STEP); break;
        case "ArrowDown": e.preventDefault(); pan(0, -ARROW_PAN_STEP); break;
        case "ArrowLeft": e.preventDefault(); pan(ARROW_PAN_STEP, 0); break;
        case "ArrowRight": e.preventDefault(); pan(-ARROW_PAN_STEP, 0); break;
        case "Home": e.preventDefault(); resetView(); break;
        default: break;
      }
    },
    [pan, resetView],
  );

  // Callback ref (không dùng useEffect+dep rời) để gắn/tháo listener đúng
  // lúc phần tử thật xuất hiện — early-return (loadError/empty) không render
  // div này nên useEffect phụ thuộc rời sẽ bỏ lỡ lần mount đầu tiên.
  const setContainerRef = useCallback(
    (el: HTMLDivElement | null) => {
      containerElRef.current?.removeEventListener("keydown", handleKeyDown);
      containerElRef.current = el;
      el?.addEventListener("keydown", handleKeyDown);
    },
    [handleKeyDown],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerElRef.current?.getBoundingClientRect();
      if (!rect) return;
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey) {
        // Pinch trên trackpad phát ra wheel + ctrlKey; Ctrl/Cmd+cuộn chuột là
        // lối tắt zoom tương đương trên desktop.
        zoomAt(px, py, Math.exp(-e.deltaY * 0.0015));
      } else {
        // Scroll-based panning — deltaX/deltaY đã tự bao gồm cuộn ngang
        // (trackpad 2 chiều, hoặc Shift+cuộn chuột đổi hướng ở tầng browser).
        pan(-e.deltaX, -e.deltaY);
      }
    },
    [pan, zoomAt],
  );

  // `hasMoved` phân biệt tap khỏi pan: chỉ preventDefault + dịch view sau khi
  // di chuyển vượt PAN_THRESHOLD_PX, để một cú tap thật (không di chuyển)
  // vẫn phát sinh click bình thường trên nút thêm/nút card bên trong.
  const PAN_THRESHOLD_PX = 6;
  const touchRef = useRef<{
    mode: "pan" | "pinch" | null;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    lastDist: number;
    hasMoved: boolean;
  }>({ mode: null, startX: 0, startY: 0, lastX: 0, lastY: 0, lastDist: 0, hasMoved: false });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t0 = e.touches[0];
      touchRef.current = {
        mode: "pan", startX: t0.clientX, startY: t0.clientY,
        lastX: t0.clientX, lastY: t0.clientY, lastDist: 0, hasMoved: false,
      };
    } else if (e.touches.length === 2) {
      const [t0, t1] = [e.touches[0], e.touches[1]];
      touchRef.current = {
        mode: "pinch", startX: 0, startY: 0, lastX: 0, lastY: 0,
        lastDist: Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY),
        hasMoved: true,
      };
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const state = touchRef.current;
      if (state.mode === "pan" && e.touches.length === 1) {
        const t0 = e.touches[0];
        const hasMoved =
          state.hasMoved ||
          Math.hypot(t0.clientX - state.startX, t0.clientY - state.startY) > PAN_THRESHOLD_PX;
        if (hasMoved) {
          e.preventDefault();
          pan(t0.clientX - state.lastX, t0.clientY - state.lastY);
        }
        touchRef.current = { ...state, lastX: t0.clientX, lastY: t0.clientY, hasMoved };
      } else if (state.mode === "pinch" && e.touches.length === 2) {
        e.preventDefault();
        const rect = containerElRef.current?.getBoundingClientRect();
        if (!rect) return;
        const [t0, t1] = [e.touches[0], e.touches[1]];
        const newDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const midX = (t0.clientX + t1.clientX) / 2 - rect.left;
        const midY = (t0.clientY + t1.clientY) / 2 - rect.top;
        if (state.lastDist > 0) zoomAt(midX, midY, newDist / state.lastDist);
        touchRef.current = { ...state, lastDist: newDist };
      }
    },
    [pan, zoomAt],
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      touchRef.current = { mode: null, startX: 0, startY: 0, lastX: 0, lastY: 0, lastDist: 0, hasMoved: false };
    } else if (e.touches.length === 1) {
      const t0 = e.touches[0];
      touchRef.current = {
        mode: "pan", startX: t0.clientX, startY: t0.clientY,
        lastX: t0.clientX, lastY: t0.clientY, lastDist: 0, hasMoved: false,
      };
    }
  }, []);

  const handleZoomButton = useCallback(
    (factor: number) => {
      const rect = containerElRef.current?.getBoundingClientRect();
      const px = rect ? rect.width / 2 : 0;
      const py = rect ? rect.height / 2 : 0;
      zoomAt(px, py, factor);
    },
    [zoomAt],
  );

  const cellProps = {
    anchor,
    selectedId: selectedPersonId,
    relationships,
    onSelect: handleSelect,
    onSetAnchor: handleSetAnchor,
    onAdd: handleAdd,
  };

  // Lỗi đọc dữ liệu — KHÔNG render màn hình "cây trống, thêm người" (đó là nói
  // dối: cây vẫn có thể còn trên đĩa, chỉ là ta không đọc được). Không gọi bất
  // kỳ hàm ghi nào ở trạng thái này.
  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-stone-50">
        <AlertTriangle className="size-14 text-amber-500" />
        <div className="text-center max-w-md">
          <h2 className="text-xl font-serif text-stone-800 mb-3">{t.canvas.loadErrorTitle}</h2>
          <p className="text-stone-600 text-sm whitespace-pre-wrap">{loadError.message}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 bg-stone-800 text-white px-6 py-3 rounded-full text-sm font-medium shadow-xl hover:bg-stone-700"
        >
          {t.canvas.reload}
        </button>
      </div>
    );
  }

  if (!isLoading && persons.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 bg-stone-50 bg-[radial-gradient(circle,_#80808012_1px,_transparent_1px)] bg-[size:24px_24px]">
        <span className="text-7xl">🌳</span>
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-serif text-stone-800 mb-3">{t.canvas.emptyTitle}</h2>
          <p className="text-stone-500">{t.canvas.emptyDesc}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
          onClick={() => openForm("quick")}
          className="flex items-center gap-2 bg-stone-800 text-white px-6 py-3 rounded-full text-sm font-medium shadow-xl hover:bg-stone-700"
        >
          <Plus className="size-4" /> {t.canvas.addFirst}
        </motion.button>
      </div>
    );
  }

  return (
    <div
      ref={setContainerRef}
      tabIndex={0}
      role="group"
      aria-label={t.viewport.canvasLabel}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="flex-1 relative overflow-hidden overscroll-contain touch-none bg-stone-50/60 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] select-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-500"
    >
      {/* Stats */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white/80 backdrop-blur-md border border-stone-200/60 rounded-full px-4 py-2 shadow-sm text-sm text-stone-700 font-medium">
        <Users className="size-4 text-stone-400" aria-hidden="true" />
        <strong>{persons.length}</strong> {t.canvas.membersCount}
        {relationships.length > 0 && (
          <>
            <span className="text-stone-300">·</span>
            <span className="text-stone-500">{relationships.length} {t.canvas.relationships}</span>
          </>
        )}
      </div>

      {/* Nút zoom/fit/reset — mỗi nút size-11 (44px), không phụ thuộc hover.
          Trước: pan/zoom không tồn tại (grep onWheel|keydown|onTouch = 0
          hit) — xem docs/tree-layout.md §9. */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col bg-white/90 backdrop-blur-md border border-stone-200/60 rounded-2xl shadow-sm overflow-hidden divide-y divide-stone-200/60">
        <button
          type="button"
          onClick={() => handleZoomButton(1.25)}
          title={t.viewport.zoomIn}
          aria-label={t.viewport.zoomIn}
          className="size-11 flex items-center justify-center text-stone-600 hover:bg-stone-100 active:bg-stone-200"
        >
          <ZoomIn className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => handleZoomButton(1 / 1.25)}
          title={t.viewport.zoomOut}
          aria-label={t.viewport.zoomOut}
          className="size-11 flex items-center justify-center text-stone-600 hover:bg-stone-100 active:bg-stone-200"
        >
          <ZoomOut className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={fitToView}
          title={t.viewport.fit}
          aria-label={t.viewport.fit}
          className="size-11 flex items-center justify-center text-stone-600 hover:bg-stone-100 active:bg-stone-200"
        >
          <Maximize2 className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={resetView}
          title={t.viewport.reset}
          aria-label={t.viewport.reset}
          className="size-11 flex items-center justify-center text-stone-600 hover:bg-stone-100 active:bg-stone-200"
        >
          <RotateCcw className="size-5" aria-hidden="true" />
        </button>
      </div>

      {/* Pan/zoom layer — transform viết tay (translate + scale), giữ điểm
          neo khi zoom (tính trong zoomAt). Thay motion.div drag cũ: drag
          không hỗ trợ pinch, không phân biệt tap/pan, không có arrow-key. */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
        }}
      >
        <div className="absolute w-0 h-0 top-1/2 left-1/2">

          {/* SVG Map Layout Lines — mỗi loại connector GỘP thành một <path> duy nhất */}
          <svg
            className="absolute pointer-events-none overflow-visible"
            style={{ left: 0, top: 0, zIndex: 0 }}
            aria-hidden="true"
          >
             {layout.connectors.map((c) => (
               <path
                 key={c.kind}
                 d={c.d}
                 stroke={CONNECTOR_STYLE[c.kind].stroke}
                 strokeDasharray={CONNECTOR_STYLE[c.kind].dash}
                 strokeWidth="2"
                 fill="none"
               />
             ))}
          </svg>

          {/* Absolute Positioning Cards Grid — render TOÀN BỘ persons, kể cả
              nhiều component rời rạc (rừng), không riêng nhánh của anchor. */}
          <AnimatePresence>
            {persons.map((person) => {
              const pos = nodeById.get(person.id);
              if (!pos) return null;
              return (
                <div
                  key={person.id}
                  className="absolute"
                  style={{
                    left: pos.x,
                    top: pos.y,
                    transform: "translate(-50%, -50%)",
                    zIndex: 10
                  }}
                >
                  <NodeCell person={person} {...cellProps} />
                </div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
