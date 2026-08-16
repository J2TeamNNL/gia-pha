/**
 * Bulk import path shared by pasted lists and file adapters.
 * Callers key people by their own `externalId`; an id that matches no entry in
 * the batch is treated as an existing person id, so a batch can attach to the
 * tree already stored.
 */
import { v4 as uuidv4 } from "uuid";
import { getDb } from "./client";
import {
  buildPersonInsert,
  buildRelationshipInsert,
  getAllPersons,
  getAllRelationships,
} from "./persons";
import type { Person, Relationship, RelationshipType } from "./types";
import { validateRelationship } from "./validation";

export interface BulkPerson extends Omit<Person, "id"> {
  externalId: string;
}

export interface BulkRelationship {
  person_external_id: string;
  related_to_external_id: string;
  rel_type: RelationshipType;
  is_primary?: boolean;
}

export interface BulkImportInput {
  persons: readonly BulkPerson[];
  relationships: readonly BulkRelationship[];
}

export interface BulkImportResult {
  persons: Person[];
  relationships: Relationship[];
  idByExternalId: Record<string, string>;
}

export type RelationKind = "parent" | "child" | "spouse" | "sibling" | "none";

/**
 * Translates "add a relative of this person" into stored edges.
 * Siblings get no edge of their own: they are linked to the target's parents,
 * which is what both the graph layout and the kinship resolver read.
 */
export function linksForRelation(
  relation: RelationKind,
  newExternalId: string,
  targetId: string | null,
  parentIdsOfTarget: readonly string[] = [],
): BulkRelationship[] {
  if (!targetId || relation === "none") return [];
  const link = (
    personId: string,
    relatedToId: string,
    relType: RelationshipType,
  ): BulkRelationship => ({
    person_external_id: personId,
    related_to_external_id: relatedToId,
    rel_type: relType,
  });

  switch (relation) {
    case "parent":
      return [link(newExternalId, targetId, "PARENT_OF")];
    case "child":
      return [link(targetId, newExternalId, "PARENT_OF")];
    case "spouse":
      return [link(newExternalId, targetId, "SPOUSE")];
    case "sibling":
      return parentIdsOfTarget.map((parentId) =>
        link(parentId, newExternalId, "PARENT_OF"),
      );
  }
}

export class BulkImportError extends Error {
  constructor(
    readonly relationshipIndex: number,
    message: string,
  ) {
    super(message);
    this.name = "BulkImportError";
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function bulkImport(
  input: BulkImportInput,
): Promise<BulkImportResult> {
  const db = await getDb();
  const [existingPersons, existingRelationships] = await Promise.all([
    getAllPersons(),
    getAllRelationships(),
  ]);

  const idByExternalId: Record<string, string> = {};
  const persons = input.persons.map(({ externalId, ...data }) => {
    const person: Person = {
      ...data,
      id: uuidv4(),
      is_anchor: data.is_anchor ?? false,
    };
    idByExternalId[externalId] = person.id;
    return person;
  });

  const personIds = new Set([
    ...existingPersons.map((person) => person.id),
    ...persons.map((person) => person.id),
  ]);
  const known = existingRelationships.map((relationship) => ({
    person_id: relationship.person_id,
    related_to_id: relationship.related_to_id,
    rel_type: relationship.rel_type,
  }));

  const relationships = input.relationships.map((entry, index) => {
    const relationship: Relationship = {
      id: uuidv4(),
      person_id:
        idByExternalId[entry.person_external_id] ?? entry.person_external_id,
      related_to_id:
        idByExternalId[entry.related_to_external_id] ??
        entry.related_to_external_id,
      rel_type: entry.rel_type,
      is_primary: entry.is_primary ?? false,
    };
    try {
      validateRelationship(relationship, personIds, known);
    } catch (error) {
      throw new BulkImportError(index, errorMessage(error));
    }
    known.push(relationship);
    return relationship;
  });

  await db.batch([
    ...persons.map(buildPersonInsert),
    ...relationships.map(buildRelationshipInsert),
  ]);

  return { persons, relationships, idByExternalId };
}
