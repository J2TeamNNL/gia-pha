import type { Gender, RelationshipType } from "../../db/types";

export type GedcomVersion = "5.5" | "5.5.1" | "7.0" | "UNKNOWN";
export type GedcomEncoding = "UTF-8" | "UTF-16LE" | "UTF-16BE" | "ANSEL" | "ASCII" | "UNKNOWN";

/** A single leveled GEDCOM line after CONT/CONC merging. */
export interface RawGedcomLine {
  level: number;
  xref?: string;
  tag: string;
  value?: string;
  line: number;
}

/** A GEDCOM line rebuilt into its level-nested tree. */
export interface GedcomNode extends RawGedcomLine {
  children: GedcomNode[];
}

export type DatePrecision = "YEAR" | "MONTH" | "DAY" | "RANGE" | "TEXT";
export type DateQualifier = "ABT" | "EST" | "CAL" | "BEF" | "AFT";

/**
 * Preserves whatever granularity GEDCOM actually supplied. RANGE only uses
 * end*; a plain date with a qualifier keeps its year/month/day alongside it.
 */
export interface GedcomDate {
  precision: DatePrecision;
  qualifier?: DateQualifier;
  year?: number;
  month?: number;
  day?: number;
  endYear?: number;
  endMonth?: number;
  endDay?: number;
  sourceText: string;
}

export type LossKind = "malformed_line" | "unsupported_semantics" | "dropped_media" | "lossy_mapping";

export interface LossEntry {
  kind: LossKind;
  message: string;
  line?: number;
  recordId?: string;
}

export interface LossReport {
  entries: LossEntry[];
}

/** Mirrors the shape of `extension_payloads` (ADR-007) without a database. */
export interface GedcomExtension {
  entityType: "INDI" | "FAM";
  entityExternalId: string;
  tag: string;
  value: string;
  path: string;
  line: number;
}

/**
 * Not a `Person`: it has no `id` because none is assigned until a later task
 * commits the import and mints real IDs. `externalId` is the bare GEDCOM xref.
 */
export interface ImportedPerson {
  externalId: string;
  first_name: string;
  last_name?: string;
  middle_name?: string;
  title_prefix?: string;
  gender: Gender;
  is_living: boolean;
  birth?: GedcomDate;
  death?: GedcomDate;
  burial_location?: string;
  notes?: string;
}

/** References `ImportedPerson.externalId`, not a database `Person.id`. */
export interface ImportedRelationship {
  person_external_id: string;
  related_to_external_id: string;
  rel_type: RelationshipType;
}

export interface GedcomImportResult {
  version: GedcomVersion;
  encoding: GedcomEncoding;
  persons: ImportedPerson[];
  relationships: ImportedRelationship[];
  extensions: GedcomExtension[];
  lossReport: LossReport;
}
