import type { Relationship, RelationshipType } from "./types";

export class GenealogyValidationError extends Error {
  constructor(
    readonly code:
      | "SELF_LINK"
      | "DANGLING_REFERENCE"
      | "DUPLICATE_MEMBERSHIP"
      | "PARENT_CYCLE",
    message: string,
  ) {
    super(message);
    this.name = "GenealogyValidationError";
  }
}

type RelationshipInput = Pick<
  Relationship,
  "person_id" | "related_to_id" | "rel_type"
>;

type FamilyPartnerMembership = {
  familyUnionId: string;
  personId: string;
};

type FamilyChildMembership = {
  familyUnionId: string;
  childPersonId: string;
};

/** Both biological and adoptive parentage participate in ancestor cycles. */
const PARENT_EDGE_TYPES: ReadonlySet<RelationshipType> = new Set([
  "PARENT_OF",
  "ADOPTED_PARENT_OF",
]);

function hasDirectedPath(
  relationships: readonly RelationshipInput[],
  fromId: string,
  toId: string,
): boolean {
  const childrenByParent = new Map<string, string[]>();
  for (const relationship of relationships) {
    if (!PARENT_EDGE_TYPES.has(relationship.rel_type)) continue;
    const children = childrenByParent.get(relationship.person_id) ?? [];
    children.push(relationship.related_to_id);
    childrenByParent.set(relationship.person_id, children);
  }

  const visited = new Set<string>();
  const pending = [fromId];
  while (pending.length) {
    const current = pending.pop();
    if (!current || visited.has(current)) continue;
    if (current === toId) return true;
    visited.add(current);
    pending.push(...(childrenByParent.get(current) ?? []));
  }
  return false;
}

export function validateRelationship(
  candidate: RelationshipInput,
  personIds: ReadonlySet<string>,
  existing: readonly RelationshipInput[],
): void {
  if (candidate.person_id === candidate.related_to_id) {
    throw new GenealogyValidationError(
      "SELF_LINK",
      "Một người không thể tạo quan hệ với chính mình.",
    );
  }
  if (!personIds.has(candidate.person_id) || !personIds.has(candidate.related_to_id)) {
    throw new GenealogyValidationError(
      "DANGLING_REFERENCE",
      "Người được chọn không còn tồn tại trong cây gia phả này.",
    );
  }
  if (
    existing.some(
      (relationship) =>
        relationship.person_id === candidate.person_id &&
        relationship.related_to_id === candidate.related_to_id &&
        relationship.rel_type === candidate.rel_type,
    )
  ) {
    throw new GenealogyValidationError(
      "DUPLICATE_MEMBERSHIP",
      "Quan hệ này đã tồn tại trong cây gia phả.",
    );
  }
  if (
    PARENT_EDGE_TYPES.has(candidate.rel_type) &&
    hasDirectedPath(existing, candidate.related_to_id, candidate.person_id)
  ) {
    throw new GenealogyValidationError(
      "PARENT_CYCLE",
      "Quan hệ cha/mẹ này sẽ tạo vòng lặp tổ tiên.",
    );
  }
}

function validateUnionMembership(
  role: "partner" | "child",
  personId: string,
  familyUnionId: string,
  personIds: ReadonlySet<string>,
  unionIds: ReadonlySet<string>,
  existingPartners: readonly FamilyPartnerMembership[],
  existingChildren: readonly FamilyChildMembership[],
): void {
  if (!personIds.has(personId) || !unionIds.has(familyUnionId)) {
    throw new GenealogyValidationError(
      "DANGLING_REFERENCE",
      "Người hoặc family union được chọn không còn tồn tại.",
    );
  }
  const isPartner = existingPartners.some(
    (partner) =>
      partner.familyUnionId === familyUnionId && partner.personId === personId,
  );
  const isChild = existingChildren.some(
    (child) =>
      child.familyUnionId === familyUnionId &&
      child.childPersonId === personId,
  );
  if (role === "partner" ? isPartner : isChild) {
    throw new GenealogyValidationError(
      "DUPLICATE_MEMBERSHIP",
      role === "partner"
        ? "Người này đã là partner của family union."
        : "Người này đã là con của family union.",
    );
  }
  if (role === "partner" ? isChild : isPartner) {
    throw new GenealogyValidationError(
      "SELF_LINK",
      "Một người không thể vừa là partner vừa là con trong cùng family union.",
    );
  }
}

export function validateFamilyPartnerMembership(
  candidate: FamilyPartnerMembership,
  personIds: ReadonlySet<string>,
  unionIds: ReadonlySet<string>,
  existingPartners: readonly FamilyPartnerMembership[],
  existingChildren: readonly FamilyChildMembership[],
): void {
  validateUnionMembership(
    "partner",
    candidate.personId,
    candidate.familyUnionId,
    personIds,
    unionIds,
    existingPartners,
    existingChildren,
  );
}

export function validateFamilyChildMembership(
  candidate: FamilyChildMembership,
  personIds: ReadonlySet<string>,
  unionIds: ReadonlySet<string>,
  existingPartners: readonly FamilyPartnerMembership[],
  existingChildren: readonly FamilyChildMembership[],
): void {
  validateUnionMembership(
    "child",
    candidate.childPersonId,
    candidate.familyUnionId,
    personIds,
    unionIds,
    existingPartners,
    existingChildren,
  );
}

export function isSupportedRelationshipType(
  value: string,
): value is RelationshipType {
  return ["PARENT_OF", "SPOUSE", "EX_SPOUSE", "ADOPTED_PARENT_OF"].includes(
    value,
  );
}
