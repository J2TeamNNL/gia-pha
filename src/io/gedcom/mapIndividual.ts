import type { Gender } from "../../db/types";
import { parseGedcomDate } from "./dates";
import { scanForExtensionsAndUnsupported } from "./extensions";
import { parseGedcomName } from "./names";
import { findChild, findChildren, stripXref } from "./records";
import type { GedcomExtension, GedcomNode, ImportedPerson, LossEntry } from "./types";

export interface MappedIndividual {
  person: ImportedPerson;
  /** Family external id -> PEDI value, for FAM mapping to resolve adoption. */
  pedigrees: Map<string, string>;
  lossEntries: LossEntry[];
  extensions: GedcomExtension[];
}

function mapGender(sexValue: string | undefined, lossEntries: LossEntry[], externalId: string): Gender {
  const upper = sexValue?.trim().toUpperCase();
  if (upper === "M") return "MALE";
  if (upper === "F") return "FEMALE";
  if (upper === "X") return "OTHER";
  if (upper === "U" || !upper) return "UNKNOWN";
  lossEntries.push({
    kind: "lossy_mapping",
    message: `SEX value ${JSON.stringify(sexValue)} is not a recognized code; mapped to UNKNOWN`,
    recordId: externalId,
  });
  return "UNKNOWN";
}

export function mapIndividual(node: GedcomNode): MappedIndividual {
  const externalId = stripXref(node.xref) ?? `LINE_${node.line}`;
  const lossEntries: LossEntry[] = [];
  const extensions: GedcomExtension[] = [];

  const nameNodes = findChildren(node, "NAME");
  const primaryName = nameNodes[0] ? parseGedcomName(nameNodes[0]) : { first_name: "" };
  if (!nameNodes[0]) {
    lossEntries.push({
      kind: "lossy_mapping",
      message: "INDI has no NAME; first_name left blank",
      recordId: externalId,
    });
  }
  if (primaryName.suffix) {
    lossEntries.push({
      kind: "unsupported_semantics",
      message: `Name suffix "${primaryName.suffix}" has no v1 field and was discarded`,
      recordId: externalId,
    });
  }
  for (const alternate of nameNodes.slice(1)) {
    lossEntries.push({
      kind: "unsupported_semantics",
      message: `Alternate NAME "${alternate.value ?? ""}" discarded; only the first NAME is imported`,
      line: alternate.line,
      recordId: externalId,
    });
  }

  const gender = mapGender(findChild(node, "SEX")?.value, lossEntries, externalId);

  const birtNode = findChild(node, "BIRT");
  const birthDateValue = birtNode && findChild(birtNode, "DATE")?.value;
  const birth = birthDateValue ? parseGedcomDate(birthDateValue) : undefined;
  if (birth && birth.precision !== "YEAR" && birth.precision !== "DAY" && birth.precision !== "MONTH") {
    lossEntries.push({
      kind: "lossy_mapping",
      message: `Birth date "${birth.sourceText}" cannot be stored as a plain year/month/day in v1; only the source text is preserved`,
      recordId: externalId,
    });
  }
  if (birtNode && findChild(birtNode, "PLAC")) {
    lossEntries.push({
      kind: "unsupported_semantics",
      message: "Birth place has no v1 field and was discarded",
      recordId: externalId,
    });
  }

  const deatNode = findChild(node, "DEAT");
  const deathDateValue = deatNode && findChild(deatNode, "DATE")?.value;
  const death = deathDateValue ? parseGedcomDate(deathDateValue) : undefined;
  if (death && death.precision !== "YEAR" && death.precision !== "DAY" && death.precision !== "MONTH") {
    lossEntries.push({
      kind: "lossy_mapping",
      message: `Death date "${death.sourceText}" cannot be stored as a plain year/month/day in v1; only the source text is preserved`,
      recordId: externalId,
    });
  }
  if (deatNode && findChild(deatNode, "PLAC")) {
    lossEntries.push({
      kind: "unsupported_semantics",
      message: "Death place has no v1 field and was discarded",
      recordId: externalId,
    });
  }

  const buriNode = findChild(node, "BURI");
  const burial_location = buriNode ? findChild(buriNode, "PLAC")?.value : undefined;

  const notes = findChildren(node, "NOTE")
    .map((n) => n.value ?? "")
    .filter(Boolean)
    .join("\n\n") || undefined;

  for (const objeNode of findChildren(node, "OBJE")) {
    const file = findChild(objeNode, "FILE")?.value;
    lossEntries.push({
      kind: "dropped_media",
      message: file ? `Media file "${file}" was not imported` : "Media reference was not imported",
      line: objeNode.line,
      recordId: externalId,
    });
  }

  const pedigrees = new Map<string, string>();
  for (const famcNode of findChildren(node, "FAMC")) {
    const famExternalId = stripXref(famcNode.value);
    const pedi = findChild(famcNode, "PEDI")?.value;
    if (famExternalId && pedi) {
      pedigrees.set(famExternalId, pedi);
    }
  }

  scanForExtensionsAndUnsupported(node, "INDI", externalId, "INDI", lossEntries, extensions);

  const person: ImportedPerson = {
    externalId,
    first_name: primaryName.first_name,
    last_name: primaryName.last_name,
    middle_name: primaryName.middle_name,
    title_prefix: primaryName.title_prefix,
    gender,
    is_living: !deatNode,
    birth,
    death,
    burial_location,
    notes,
  };

  return { person, pedigrees, lossEntries, extensions };
}
