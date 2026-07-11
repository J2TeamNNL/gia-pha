/**
 * Pure layered layout for the family graph.
 *
 * Generations are assigned by BFS from the focus person (parents -1,
 * children +1, partners same level). Couples sit adjacent; children hang
 * from the midpoint between their parents. The result is plain data so it
 * can run inside a Web Worker.
 */
import type { Person, Relationship } from "@/db/types";

export const NODE_WIDTH = 160;
export const NODE_HEIGHT = 150;
export const H_GAP = 48;
export const V_GAP = 110;
/** Hard cap on simultaneously rendered nodes. */
export const MAX_VISIBLE_NODES = 500;

export interface LayoutInput {
  persons: Person[];
  relationships: Relationship[];
  focusId: string | null;
  /** Generations to show in each direction from the focus person; null = all. */
  depth: number | null;
}

export interface LayoutNode {
  person: Person;
  x: number;
  y: number;
  generation: number;
}

export interface CoupleEdge {
  type: "couple";
  fromId: string;
  toId: string;
  divorced: boolean;
}

export interface ParentChildEdge {
  type: "parent-child";
  /** One or two parent ids; the drop line starts between them. */
  parentIds: string[];
  childId: string;
  adopted: boolean;
}

export type LayoutEdge = CoupleEdge | ParentChildEdge;

export interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  /** Persons excluded by the depth filter or the visible-node guard. */
  hiddenCount: number;
  width: number;
  height: number;
}

const PARENT_TYPES = new Set(["PARENT_OF", "ADOPTED_PARENT_OF"]);
const COUPLE_TYPES = new Set(["SPOUSE", "EX_SPOUSE"]);

interface Adjacency {
  parentsOf: Map<string, string[]>;
  childrenOf: Map<string, string[]>;
  partnersOf: Map<string, string[]>;
}

function buildAdjacency(relationships: readonly Relationship[]): Adjacency {
  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  const partnersOf = new Map<string, string[]>();
  const push = (map: Map<string, string[]>, key: string, value: string) => {
    const list = map.get(key) ?? [];
    if (!list.includes(value)) list.push(value);
    map.set(key, list);
  };
  for (const rel of relationships) {
    if (PARENT_TYPES.has(rel.rel_type)) {
      push(childrenOf, rel.person_id, rel.related_to_id);
      push(parentsOf, rel.related_to_id, rel.person_id);
    } else if (COUPLE_TYPES.has(rel.rel_type)) {
      push(partnersOf, rel.person_id, rel.related_to_id);
      push(partnersOf, rel.related_to_id, rel.person_id);
    }
  }
  return { parentsOf, childrenOf, partnersOf };
}

/** BFS from the focus assigning a generation to every reachable person. */
function assignGenerations(
  focusId: string,
  adjacency: Adjacency,
): Map<string, number> {
  const generation = new Map<string, number>([[focusId, 0]]);
  const queue = [focusId];
  while (queue.length) {
    const current = queue.shift()!;
    const gen = generation.get(current)!;
    const visit = (id: string, nextGen: number) => {
      if (generation.has(id)) return;
      generation.set(id, nextGen);
      queue.push(id);
    };
    for (const parent of adjacency.parentsOf.get(current) ?? []) visit(parent, gen - 1);
    for (const child of adjacency.childrenOf.get(current) ?? []) visit(child, gen + 1);
    for (const partner of adjacency.partnersOf.get(current) ?? []) visit(partner, gen);
  }
  return generation;
}

export function computeLayout(input: LayoutInput): LayoutResult {
  const { persons, relationships, depth } = input;
  if (!persons.length) {
    return { nodes: [], edges: [], hiddenCount: 0, width: 0, height: 0 };
  }

  const personById = new Map(persons.map((person) => [person.id, person]));
  const focusId =
    input.focusId && personById.has(input.focusId)
      ? input.focusId
      : (persons.find((person) => person.is_anchor)?.id ?? persons[0].id);

  const adjacency = buildAdjacency(relationships);
  const generation = assignGenerations(focusId, adjacency);
  // Disconnected people are placed one generation below the deepest row so
  // they stay reachable rather than silently invisible.
  const knownGenerations = [...generation.values()];
  const orphanGeneration = knownGenerations.length
    ? Math.max(...knownGenerations) + 1
    : 0;
  for (const person of persons) {
    if (!generation.has(person.id)) generation.set(person.id, orphanGeneration);
  }

  // Depth filter, then the visible-node guard (closest generations win).
  let visible = persons.filter((person) => {
    if (depth === null) return true;
    return Math.abs(generation.get(person.id)!) <= depth;
  });
  visible.sort(
    (a, b) =>
      Math.abs(generation.get(a.id)!) - Math.abs(generation.get(b.id)!),
  );
  if (visible.length > MAX_VISIBLE_NODES) {
    visible = visible.slice(0, MAX_VISIBLE_NODES);
  }
  const hiddenCount = persons.length - visible.length;
  const visibleIds = new Set(visible.map((person) => person.id));

  // Order each generation row: BFS discovery order keeps relatives together;
  // partners are pulled adjacent to each other.
  const rows = new Map<number, Person[]>();
  for (const person of visible) {
    const gen = generation.get(person.id)!;
    const row = rows.get(gen) ?? [];
    row.push(person);
    rows.set(gen, row);
  }
  for (const row of rows.values()) {
    for (let i = 0; i < row.length; i++) {
      const partners = adjacency.partnersOf.get(row[i].id) ?? [];
      for (const partnerId of partners) {
        const j = row.findIndex((p) => p.id === partnerId);
        if (j > i + 1) {
          const [partner] = row.splice(j, 1);
          row.splice(i + 1, 0, partner);
        }
      }
    }
  }

  const generations = [...rows.keys()].sort((a, b) => a - b);
  const minGen = generations[0] ?? 0;
  const maxRowWidth = Math.max(
    ...generations.map(
      (gen) => rows.get(gen)!.length * (NODE_WIDTH + H_GAP) - H_GAP,
    ),
    NODE_WIDTH,
  );

  const nodes: LayoutNode[] = [];
  for (const gen of generations) {
    const row = rows.get(gen)!;
    const rowWidth = row.length * (NODE_WIDTH + H_GAP) - H_GAP;
    const startX = (maxRowWidth - rowWidth) / 2;
    row.forEach((person, index) => {
      nodes.push({
        person,
        x: startX + index * (NODE_WIDTH + H_GAP),
        y: (gen - minGen) * (NODE_HEIGHT + V_GAP),
        generation: gen,
      });
    });
  }

  const edges: LayoutEdge[] = [];
  const seenCouples = new Set<string>();
  for (const rel of relationships) {
    if (!visibleIds.has(rel.person_id) || !visibleIds.has(rel.related_to_id)) {
      continue;
    }
    if (COUPLE_TYPES.has(rel.rel_type)) {
      const key = [rel.person_id, rel.related_to_id].sort().join("|");
      if (seenCouples.has(key)) continue;
      seenCouples.add(key);
      edges.push({
        type: "couple",
        fromId: rel.person_id,
        toId: rel.related_to_id,
        divorced: rel.rel_type === "EX_SPOUSE",
      });
    }
  }
  // Group parent-child edges per child so two parents share one drop line.
  const childEdges = new Map<string, { parentIds: string[]; adopted: boolean }>();
  for (const rel of relationships) {
    if (!PARENT_TYPES.has(rel.rel_type)) continue;
    if (!visibleIds.has(rel.person_id) || !visibleIds.has(rel.related_to_id)) {
      continue;
    }
    const entry = childEdges.get(rel.related_to_id) ?? {
      parentIds: [],
      adopted: false,
    };
    if (!entry.parentIds.includes(rel.person_id)) entry.parentIds.push(rel.person_id);
    entry.adopted = entry.adopted || rel.rel_type === "ADOPTED_PARENT_OF";
    childEdges.set(rel.related_to_id, entry);
  }
  for (const [childId, entry] of childEdges) {
    edges.push({
      type: "parent-child",
      parentIds: entry.parentIds,
      childId,
      adopted: entry.adopted,
    });
  }

  const height = generations.length
    ? (generations.length - 1) * (NODE_HEIGHT + V_GAP) + NODE_HEIGHT
    : 0;
  return { nodes, edges, hiddenCount, width: maxRowWidth, height };
}
