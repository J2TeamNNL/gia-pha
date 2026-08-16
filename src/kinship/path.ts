import { buildKinshipGraph, HOP_PRIORITY, type KinshipEdge } from "./graph";
import type { KinshipPerson, KinshipRelationship, PathHop, PathResult } from "./types";

export const MAX_PATH_DEPTH = 4;

function hopToString(hop: PathHop): string {
  if (hop.seniority === "ELDER") return `e${hop.kind}`;
  if (hop.seniority === "YOUNGER") return `y${hop.kind}`;
  return hop.kind;
}

function buildSignature(hops: readonly PathHop[]): string {
  return hops.map(hopToString).join("");
}

function sortEdges(edges: readonly KinshipEdge[]): KinshipEdge[] {
  return [...edges].sort((a, b) => {
    const priority = HOP_PRIORITY.indexOf(a.kind) - HOP_PRIORITY.indexOf(b.kind);
    if (priority !== 0) return priority;
    return a.toId < b.toId ? -1 : a.toId > b.toId ? 1 : 0;
  });
}

/**
 * XH-001 — shortest path from `egoId` to `targetId` over parent/child/partner
 * edges plus derived sibling edges, capped at `maxDepth` hops. Ties are
 * broken by `HOP_PRIORITY` so the same tree always yields the same path.
 */
export function resolvePath(
  egoId: string,
  targetId: string,
  persons: readonly KinshipPerson[],
  relationships: readonly KinshipRelationship[],
  maxDepth: number = MAX_PATH_DEPTH,
): PathResult {
  if (egoId === targetId) {
    return { signature: "SELF", hops: [], distant: false };
  }

  const graph = buildKinshipGraph(persons, relationships);
  const visited = new Map<string, PathHop[]>([[egoId, []]]);
  let frontier = [egoId];

  for (let depth = 0; depth < maxDepth; depth++) {
    const next: string[] = [];
    for (const nodeId of frontier) {
      const edges = sortEdges(graph.get(nodeId) ?? []);
      for (const edge of edges) {
        if (visited.has(edge.toId)) continue;
        const hops = [
          ...visited.get(nodeId)!,
          { kind: edge.kind, personId: edge.toId, seniority: edge.seniority },
        ];
        visited.set(edge.toId, hops);
        if (edge.toId === targetId) {
          return { signature: buildSignature(hops), hops, distant: false };
        }
        next.push(edge.toId);
      }
    }
    frontier = next;
  }

  return { signature: "DISTANT", hops: [], distant: true };
}
