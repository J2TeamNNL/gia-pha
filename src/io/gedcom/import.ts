import { decodeGedcomBytes } from "./encoding";
import { mapFamily } from "./mapFamily";
import { mapIndividual } from "./mapIndividual";
import { buildRecordTree, findChild } from "./records";
import { mergeContinuations, tokenizeGedcom } from "./tokenizer";
import type {
  GedcomExtension,
  GedcomImportResult,
  GedcomNode,
  GedcomVersion,
  ImportedPerson,
  ImportedRelationship,
  LossEntry,
} from "./types";

const KNOWN_TOP_LEVEL_TAGS = new Set(["HEAD", "INDI", "FAM", "TRLR", "SUBM", "NOTE", "SOUR"]);

function detectVersion(headNode: GedcomNode | undefined): GedcomVersion {
  const gedcNode = headNode && findChild(headNode, "GEDC");
  const versValue = gedcNode && findChild(gedcNode, "VERS")?.value?.trim();
  if (!versValue) return "UNKNOWN";
  if (versValue.startsWith("5.5.1")) return "5.5.1";
  if (versValue.startsWith("5.5")) return "5.5";
  if (versValue.startsWith("7")) return "7.0";
  return "UNKNOWN";
}

/**
 * Parses and maps a GEDCOM file into the v1 flat model (persons +
 * relationships). Nothing is written to a database; committing the result
 * is a separate, later step that also mints real person IDs.
 */
export function importGedcom(input: ArrayBuffer | Uint8Array | string): GedcomImportResult {
  const decoded =
    typeof input === "string"
      ? { text: input, encoding: "UTF-8" as const }
      : decodeGedcomBytes(input instanceof Uint8Array ? input : new Uint8Array(input));

  const { lines, lossEntries: tokenizeLossEntries } = tokenizeGedcom(decoded.text);
  const roots = buildRecordTree(mergeContinuations(lines));

  const lossEntries: LossEntry[] = [...tokenizeLossEntries];
  const extensions: GedcomExtension[] = [];
  const persons: ImportedPerson[] = [];
  const relationships: ImportedRelationship[] = [];

  const headNode = roots.find((root) => root.tag === "HEAD");
  const version = detectVersion(headNode);

  const pedigreeByChild = new Map<string, Map<string, string>>();
  for (const node of roots.filter((root) => root.tag === "INDI")) {
    const mapped = mapIndividual(node);
    persons.push(mapped.person);
    pedigreeByChild.set(mapped.person.externalId, mapped.pedigrees);
    lossEntries.push(...mapped.lossEntries);
    extensions.push(...mapped.extensions);
  }

  for (const node of roots.filter((root) => root.tag === "FAM")) {
    const mapped = mapFamily(node, pedigreeByChild);
    relationships.push(...mapped.relationships);
    lossEntries.push(...mapped.lossEntries);
    extensions.push(...mapped.extensions);
  }

  for (const node of roots) {
    if (!KNOWN_TOP_LEVEL_TAGS.has(node.tag) && !node.tag.startsWith("_")) {
      lossEntries.push({
        kind: "unsupported_semantics",
        message: `Top-level record ${node.tag} is not imported`,
        line: node.line,
        recordId: node.xref,
      });
    }
  }

  return {
    version,
    encoding: decoded.encoding,
    persons,
    relationships,
    extensions,
    lossReport: { entries: lossEntries },
  };
}
