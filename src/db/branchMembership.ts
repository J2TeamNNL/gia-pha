import type { Relationship, RelationshipType } from "./types";

export type RelationshipEdge = Pick<Relationship, "person_id" | "related_to_id" | "rel_type">;

const DESCENT_EDGE_TYPES: ReadonlySet<RelationshipType> = new Set([
  "PARENT_OF",
  "ADOPTED_PARENT_OF",
]);
const SPOUSE_EDGE_TYPES: ReadonlySet<RelationshipType> = new Set(["SPOUSE", "EX_SPOUSE"]);

/**
 * A branch is a root's descendants plus everyone married into one of those
 * descendants (ADR-012). Manual assignments are layered on separately by the
 * caller and never flow through this function.
 */
export function computeDerivedBranchMembers(
  rootPersonIds: readonly string[],
  relationships: readonly RelationshipEdge[],
): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  const spousesByPerson = new Map<string, string[]>();
  for (const relationship of relationships) {
    if (DESCENT_EDGE_TYPES.has(relationship.rel_type)) {
      const children = childrenByParent.get(relationship.person_id) ?? [];
      children.push(relationship.related_to_id);
      childrenByParent.set(relationship.person_id, children);
    } else if (SPOUSE_EDGE_TYPES.has(relationship.rel_type)) {
      const forward = spousesByPerson.get(relationship.person_id) ?? [];
      forward.push(relationship.related_to_id);
      spousesByPerson.set(relationship.person_id, forward);
      const backward = spousesByPerson.get(relationship.related_to_id) ?? [];
      backward.push(relationship.person_id);
      spousesByPerson.set(relationship.related_to_id, backward);
    }
  }

  const descendants = new Set<string>();
  const pending = [...rootPersonIds];
  while (pending.length) {
    const current = pending.pop();
    if (!current || descendants.has(current)) continue;
    descendants.add(current);
    pending.push(...(childrenByParent.get(current) ?? []));
  }

  const members = new Set(descendants);
  for (const descendantId of descendants) {
    for (const spouseId of spousesByPerson.get(descendantId) ?? []) {
      members.add(spouseId);
    }
  }
  return members;
}
