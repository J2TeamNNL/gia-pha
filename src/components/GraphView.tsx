import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Maximize, Minus, Plus } from "lucide-react";
import { useTreeStore } from "@/store/treeStore";
import { useTranslation } from "@/i18n/useTranslation";
import { useGraphLayout } from "@/graph/useGraphLayout";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  type LayoutNode,
  type LayoutResult,
} from "@/graph/layout";
import { PersonCard } from "@/components/PersonCard";

const MIN_SCALE = 0.2;
const MAX_SCALE = 2.5;
const DEPTH_CHOICES = [1, 2, 3, 4, 5] as const;

interface Transform {
  x: number;
  y: number;
  scale: number;
}

function centerX(node: LayoutNode): number {
  return node.x + NODE_WIDTH / 2;
}

function edgePaths(layout: LayoutResult) {
  const byId = new Map(layout.nodes.map((node) => [node.person.id, node]));
  const couples: { key: string; d: string; dashed: boolean }[] = [];
  const drops: { key: string; d: string; dashed: boolean }[] = [];
  for (const edge of layout.edges) {
    if (edge.type === "couple") {
      const a = byId.get(edge.fromId);
      const b = byId.get(edge.toId);
      if (!a || !b) continue;
      const y = a.y + NODE_HEIGHT / 2;
      couples.push({
        key: `c-${edge.fromId}-${edge.toId}`,
        d: `M ${centerX(a)} ${y} L ${centerX(b)} ${y}`,
        dashed: edge.divorced,
      });
    } else {
      const child = byId.get(edge.childId);
      const parents = edge.parentIds
        .map((id) => byId.get(id))
        .filter((node): node is LayoutNode => Boolean(node));
      if (!child || !parents.length) continue;
      const unionX =
        parents.reduce((sum, node) => sum + centerX(node), 0) / parents.length;
      const unionY = parents[0].y + NODE_HEIGHT / 2;
      const midY = (unionY + child.y) / 2 + NODE_HEIGHT / 4;
      drops.push({
        key: `p-${edge.childId}`,
        d: `M ${unionX} ${unionY} V ${midY} H ${centerX(child)} V ${child.y}`,
        dashed: edge.adopted,
      });
    }
  }
  return [...couples, ...drops];
}

export function GraphView() {
  const {
    persons,
    relationships,
    selectedPersonId,
    selectPerson,
    anchorPersonId,
    openForm,
  } = useTreeStore();
  const t = useTranslation();
  const [depth, setDepth] = useState<number | null>(2);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const panState = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  const layout = useGraphLayout(
    useMemo(
      () => ({ persons, relationships, focusId: focusId ?? anchorPersonId, depth }),
      [persons, relationships, focusId, anchorPersonId, depth],
    ),
  );

  const fitView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !layout || !layout.width) return;
    const { clientWidth, clientHeight } = viewport;
    const scale = Math.min(
      MAX_SCALE,
      Math.max(
        MIN_SCALE,
        Math.min(
          (clientWidth - 80) / layout.width,
          (clientHeight - 80) / layout.height,
          1,
        ),
      ),
    );
    setTransform({
      x: (clientWidth - layout.width * scale) / 2,
      y: (clientHeight - layout.height * scale) / 2,
      scale,
    });
  }, [layout]);

  // Refit when the layout shape changes (new tree, depth or focus change).
  const layoutSignature = layout ? `${layout.width}x${layout.height}` : "";
  useEffect(() => {
    fitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutSignature]);

  const zoomBy = useCallback((factor: number, pivot?: { x: number; y: number }) => {
    setTransform((current) => {
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * factor));
      if (scale === current.scale) return current;
      const viewport = viewportRef.current;
      const cx = pivot?.x ?? (viewport ? viewport.clientWidth / 2 : 0);
      const cy = pivot?.y ?? (viewport ? viewport.clientHeight / 2 : 0);
      const ratio = scale / current.scale;
      return {
        scale,
        x: cx - (cx - current.x) * ratio,
        y: cy - (cy - current.y) * ratio,
      };
    });
  }, []);

  const onWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15, {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    });
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    panState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const pan = panState.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    setTransform((current) => ({
      ...current,
      x: pan.originX + event.clientX - pan.startX,
      y: pan.originY + event.clientY - pan.startY,
    }));
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (panState.current?.pointerId === event.pointerId) panState.current = null;
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const PAN_STEP = 60;
    if (event.key === "+" || event.key === "=") zoomBy(1.15);
    else if (event.key === "-") zoomBy(1 / 1.15);
    else if (event.key === "0") fitView();
    else if (event.key === "ArrowLeft")
      setTransform((c) => ({ ...c, x: c.x + PAN_STEP }));
    else if (event.key === "ArrowRight")
      setTransform((c) => ({ ...c, x: c.x - PAN_STEP }));
    else if (event.key === "ArrowUp")
      setTransform((c) => ({ ...c, y: c.y + PAN_STEP }));
    else if (event.key === "ArrowDown")
      setTransform((c) => ({ ...c, y: c.y - PAN_STEP }));
    else return;
    event.preventDefault();
  };

  if (!layout) return null;
  const paths = edgePaths(layout);
  const hiddenNotice = t.graph.hiddenNotice.replace(
    "{count}",
    String(layout.hiddenCount),
  );

  return (
    <div
      ref={viewportRef}
      role="application"
      aria-label={t.appName}
      tabIndex={0}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className="flex-1 relative overflow-hidden bg-stone-50/40 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] cursor-grab active:cursor-grabbing outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-inset"
    >
      {/* Stats + hidden-node guard notice */}
      <div className="absolute top-5 left-5 z-20 flex flex-col gap-2 items-start">
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md border border-stone-200/60 rounded-full px-5 py-2.5 shadow-sm text-sm text-stone-700 font-medium">
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
        {layout.hiddenCount > 0 && (
          <p
            role="status"
            className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-full px-4 py-1.5 shadow-sm"
          >
            {hiddenNotice}
          </p>
        )}
      </div>

      {/* Toolbar */}
      <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2">
        <label className="flex items-center gap-2 bg-white/90 border border-stone-200 rounded-full pl-4 pr-2 py-1.5 text-xs text-stone-600 shadow-sm">
          {t.graph.depthLabel}
          <select
            value={depth === null ? "all" : String(depth)}
            onChange={(event) =>
              setDepth(event.target.value === "all" ? null : Number(event.target.value))
            }
            className="bg-stone-100 rounded-full px-2 py-1 text-xs text-stone-800 outline-none"
          >
            {DEPTH_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
            <option value="all">{t.graph.depthAll}</option>
          </select>
        </label>
        <button
          type="button"
          aria-label={t.graph.focusSelected}
          title={t.graph.focusSelected}
          disabled={!selectedPersonId}
          onClick={() => selectedPersonId && setFocusId(selectedPersonId)}
          className="size-9 flex items-center justify-center bg-white border border-stone-200 rounded-full text-stone-600 shadow-sm hover:bg-stone-50 disabled:opacity-40 transition-colors"
        >
          <Crosshair className="size-4" />
        </button>
        <button
          type="button"
          aria-label={t.graph.fitView}
          title={t.graph.fitView}
          onClick={fitView}
          className="size-9 flex items-center justify-center bg-white border border-stone-200 rounded-full text-stone-600 shadow-sm hover:bg-stone-50 transition-colors"
        >
          <Maximize className="size-4" />
        </button>
        <button
          type="button"
          aria-label={t.graph.zoomOut}
          title={t.graph.zoomOut}
          onClick={() => zoomBy(1 / 1.15)}
          className="size-9 flex items-center justify-center bg-white border border-stone-200 rounded-full text-stone-600 shadow-sm hover:bg-stone-50 transition-colors"
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          aria-label={t.graph.zoomIn}
          title={t.graph.zoomIn}
          onClick={() => zoomBy(1.15)}
          className="size-9 flex items-center justify-center bg-white border border-stone-200 rounded-full text-stone-600 shadow-sm hover:bg-stone-50 transition-colors"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* Graph surface */}
      <div
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
          width: layout.width,
          height: layout.height,
        }}
        className="absolute top-0 left-0"
      >
        <svg
          width={layout.width}
          height={layout.height}
          className="absolute top-0 left-0 pointer-events-none overflow-visible"
          aria-hidden
        >
          {paths.map((path) => (
            <path
              key={path.key}
              d={path.d}
              fill="none"
              stroke="#a8a29e"
              strokeWidth={2}
              strokeDasharray={path.dashed ? "6 5" : undefined}
            />
          ))}
        </svg>
        {layout.nodes.map((node) => (
          <div
            key={node.person.id}
            style={{ position: "absolute", left: node.x, top: node.y }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <PersonCard
              person={node.person}
              isSelected={selectedPersonId === node.person.id}
              onClick={() =>
                selectPerson(
                  node.person.id === selectedPersonId ? null : node.person.id,
                )
              }
              onAddRelative={(direction) => {
                const relMap: Record<string, "parent" | "child" | "spouse" | "sibling"> = {
                  top: "parent",
                  bottom: "child",
                  left: "sibling",
                  right: "spouse",
                };
                openForm("quick", {
                  targetId: node.person.id,
                  relType: relMap[direction],
                });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
