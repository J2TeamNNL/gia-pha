import { compareSeniority } from "./seniority";
import type { HopKind, KinshipPerson, KinshipRelationship, Seniority } from "./types";

export interface KinshipEdge {
  kind: HopKind;
  toId: string;
  seniority?: Seniority;
}

const PARENT_TYPES = new Set<KinshipRelationship["rel_type"]>(["PARENT_OF", "ADOPTED_PARENT_OF"]);
const COUPLE_TYPES = new Set<KinshipRelationship["rel_type"]>(["SPOUSE", "EX_SPOUSE"]);

/** Hop-kind priority used to break ties deterministically during BFS (XH-001). */
export const HOP_PRIORITY: readonly HopKind[] = ["F", "M", "S", "D", "B", "Z", "H", "W"];

function letterFor(person: KinshipPerson, maleKind: HopKind, femaleKind: HopKind): HopKind {
  return person.gender === "FEMALE" ? femaleKind : maleKind;
}

/** Builds the per-person edge list used by path resolution, deriving sibling
 * edges from shared parents rather than reading them from `relationships`. */
export function buildKinshipGraph(
  persons: readonly KinshipPerson[],
  relationships: readonly KinshipRelationship[],
): Map<string, KinshipEdge[]> {
  const personById = new Map(persons.map((person) => [person.id, person]));
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

  const graph = new Map<string, KinshipEdge[]>();
  for (const person of persons) {
    const edges: KinshipEdge[] = [];

    for (const parentId of parentsOf.get(person.id) ?? []) {
      const parent = personById.get(parentId);
      if (!parent) continue;
      edges.push({ kind: letterFor(parent, "F", "M"), toId: parentId });
    }
    for (const childId of childrenOf.get(person.id) ?? []) {
      const child = personById.get(childId);
      if (!child) continue;
      edges.push({ kind: letterFor(child, "S", "D"), toId: childId });
    }
    for (const partnerId of partnersOf.get(person.id) ?? []) {
      const partner = personById.get(partnerId);
      if (!partner) continue;
      edges.push({ kind: letterFor(partner, "H", "W"), toId: partnerId });
    }

    const siblingIds = new Set<string>();
    for (const parentId of parentsOf.get(person.id) ?? []) {
      for (const siblingId of childrenOf.get(parentId) ?? []) {
        if (siblingId !== person.id) siblingIds.add(siblingId);
      }
    }
    for (const siblingId of siblingIds) {
      const sibling = personById.get(siblingId);
      if (!sibling) continue;
      edges.push({
        kind: letterFor(sibling, "B", "Z"),
        toId: siblingId,
        seniority: compareSeniority(sibling, person),
      });
    }

    graph.set(person.id, edges);
  }
  return graph;
}
