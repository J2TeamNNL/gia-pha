import { scanForExtensionsAndUnsupported } from "./extensions";
import { findChild, findChildren, stripXref } from "./records";
import type { GedcomExtension, GedcomNode, ImportedRelationship, LossEntry } from "./types";

export interface MappedFamily {
  relationships: ImportedRelationship[];
  lossEntries: LossEntry[];
  extensions: GedcomExtension[];
}

function pointerValues(node: GedcomNode, tag: string): string[] {
  return findChildren(node, tag)
    .map((child) => stripXref(child.value))
    .filter((value): value is string => Boolean(value));
}

/**
 * Maps a FAM record to relationships in the live v1 model: HUSB/WIFE pairs
 * become SPOUSE (or EX_SPOUSE when DIV is present), and CHIL becomes
 * PARENT_OF from every parent, upgraded to ADOPTED_PARENT_OF when the
 * child's own FAMC.PEDI (collected during INDI mapping) says "adopted".
 */
export function mapFamily(
  node: GedcomNode,
  pedigreeByChild: Map<string, Map<string, string>>,
): MappedFamily {
  const externalId = stripXref(node.xref) ?? `LINE_${node.line}`;
  const lossEntries: LossEntry[] = [];
  const extensions: GedcomExtension[] = [];
  const relationships: ImportedRelationship[] = [];

  const husbands = pointerValues(node, "HUSB");
  const wives = pointerValues(node, "WIFE");
  const isDivorced = Boolean(findChild(node, "DIV"));

  for (const husband of husbands) {
    for (const wife of wives) {
      relationships.push({
        person_external_id: husband,
        related_to_external_id: wife,
        rel_type: isDivorced ? "EX_SPOUSE" : "SPOUSE",
      });
    }
  }

  const parents = [...husbands, ...wives];
  const children = pointerValues(node, "CHIL");

  for (const child of children) {
    const pedigree = pedigreeByChild.get(child)?.get(externalId);
    const isAdopted = pedigree?.toUpperCase() === "ADOPTED";
    if (pedigree && !isAdopted && pedigree.toUpperCase() !== "BIRTH") {
      lossEntries.push({
        kind: "lossy_mapping",
        message: `Pedigree "${pedigree}" for child ${child} in family ${externalId} has no v1 relationship type; mapped to PARENT_OF`,
        recordId: externalId,
      });
    }
    for (const parent of parents) {
      relationships.push({
        person_external_id: parent,
        related_to_external_id: child,
        rel_type: isAdopted ? "ADOPTED_PARENT_OF" : "PARENT_OF",
      });
    }
  }

  scanForExtensionsAndUnsupported(node, "FAM", externalId, "FAM", lossEntries, extensions);

  return { relationships, lossEntries, extensions };
}
