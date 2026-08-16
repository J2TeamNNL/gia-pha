import type { GedcomExtension, GedcomNode, LossEntry } from "./types";

const KNOWN_TAGS = new Set([
  "NAME",
  "SEX",
  "BIRT",
  "DEAT",
  "BURI",
  "NOTE",
  "OBJE",
  "FAMS",
  "FAMC",
  "DATE",
  "PLAC",
  "PEDI",
  "GIVN",
  "SURN",
  "NPFX",
  "NSFX",
  "FILE",
  "HUSB",
  "WIFE",
  "CHIL",
  "DIV",
  "MARR",
  "HEAD",
  "GEDC",
  "VERS",
  "FORM",
  "CHAR",
  "SOUR",
  "SUBM",
  "TRLR",
]);

/**
 * Walks a record's full subtree recording custom `_XXXX` tags as preserved
 * extensions (ADR-007) and any other unmapped tag as a reported, discarded
 * unsupported-semantics entry. Shared by INDI and FAM mapping.
 */
export function scanForExtensionsAndUnsupported(
  node: GedcomNode,
  entityType: "INDI" | "FAM",
  entityExternalId: string,
  path: string,
  lossEntries: LossEntry[],
  extensions: GedcomExtension[],
): void {
  for (const child of node.children) {
    const childPath = `${path}.${child.tag}`;
    if (child.tag.startsWith("_")) {
      extensions.push({
        entityType,
        entityExternalId,
        tag: child.tag,
        value: child.value ?? "",
        path: childPath,
        line: child.line,
      });
    } else if (!KNOWN_TAGS.has(child.tag)) {
      lossEntries.push({
        kind: "unsupported_semantics",
        message: `Tag ${child.tag} at ${childPath} is not mapped and was discarded`,
        line: child.line,
        recordId: entityExternalId,
      });
    }
    scanForExtensionsAndUnsupported(child, entityType, entityExternalId, childPath, lossEntries, extensions);
  }
}
