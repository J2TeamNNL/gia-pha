import { v4 as uuidv4 } from "uuid";
import { getDb } from "./client";
import {
  validateFamilyChildMembership,
  validateFamilyPartnerMembership,
} from "./validation";

export type FamilyUnion = {
  id: string;
  status: "UNKNOWN" | "MARRIED" | "DIVORCED" | "SEPARATED" | "PARTNERSHIP" | "OTHER";
  notes?: string;
};

export type FamilyPartner = {
  id: string;
  family_union_id: string;
  person_id: string;
  role: "PARTNER" | "PARENT" | "OTHER";
  position?: number;
};

export type FamilyChild = {
  id: string;
  family_union_id: string;
  child_person_id: string;
  parentage_type: "BIOLOGICAL" | "ADOPTED" | "STEP" | "FOSTER" | "UNKNOWN";
  birth_order?: number;
  notes?: string;
};

type MembershipRow = [string, string];

function values(result: Awaited<ReturnType<Awaited<ReturnType<typeof getDb>>["exec"]>>) {
  return result[0]?.values ?? [];
}

async function validationContext() {
  const db = await getDb();
  const [personResult, unionResult, partnerResult, childResult] = await Promise.all([
    db.exec("SELECT id FROM persons"),
    db.exec("SELECT id FROM family_unions"),
    db.exec("SELECT family_union_id, person_id FROM family_partners"),
    db.exec("SELECT family_union_id, child_person_id FROM family_children"),
  ]);
  return {
    db,
    personIds: new Set(values(personResult).map((row) => String(row[0]))),
    unionIds: new Set(values(unionResult).map((row) => String(row[0]))),
    partners: values(partnerResult).map((row) => {
      const [familyUnionId, personId] = row as MembershipRow;
      return { familyUnionId, personId };
    }),
    children: values(childResult).map((row) => {
      const [familyUnionId, childPersonId] = row as MembershipRow;
      return { familyUnionId, childPersonId };
    }),
  };
}

export async function createFamilyUnion(
  input: Omit<FamilyUnion, "id"> = { status: "UNKNOWN" },
): Promise<FamilyUnion> {
  const db = await getDb();
  const union: FamilyUnion = { id: uuidv4(), status: input.status, notes: input.notes };
  await db.run(
    "INSERT INTO family_unions (id, status, notes) VALUES (?, ?, ?)",
    [union.id, union.status, union.notes ?? null],
  );
  return union;
}

export async function addFamilyPartner(
  input: Omit<FamilyPartner, "id">,
): Promise<FamilyPartner> {
  const context = await validationContext();
  validateFamilyPartnerMembership(
    { familyUnionId: input.family_union_id, personId: input.person_id },
    context.personIds,
    context.unionIds,
    context.partners,
    context.children,
  );
  const partner: FamilyPartner = { id: uuidv4(), ...input };
  await context.db.run(
    "INSERT INTO family_partners (id, family_union_id, person_id, role, position) VALUES (?, ?, ?, ?, ?)",
    [partner.id, partner.family_union_id, partner.person_id, partner.role, partner.position ?? null],
  );
  return partner;
}

export async function addFamilyChild(
  input: Omit<FamilyChild, "id">,
): Promise<FamilyChild> {
  const context = await validationContext();
  validateFamilyChildMembership(
    { familyUnionId: input.family_union_id, childPersonId: input.child_person_id },
    context.personIds,
    context.unionIds,
    context.partners,
    context.children,
  );
  const child: FamilyChild = { id: uuidv4(), ...input };
  await context.db.run(
    "INSERT INTO family_children (id, family_union_id, child_person_id, parentage_type, birth_order, notes) VALUES (?, ?, ?, ?, ?, ?)",
    [
      child.id,
      child.family_union_id,
      child.child_person_id,
      child.parentage_type,
      child.birth_order ?? null,
      child.notes ?? null,
    ],
  );
  return child;
}
