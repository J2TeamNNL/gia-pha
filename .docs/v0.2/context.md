<!-- snapshot: v0.2 | current | updated: 2026-08-16 -->

# Technical Context

Architecture, domain model, and interchange contracts for this snapshot.

---

# Target Architecture

Status: `TARGET`; none of this document should be interpreted as implemented in `gia-pha`.

## Principles

- Local-only by default: no account, server database, telemetry, or automatic error upload.
- Static hosted app and self-hosted app use the same artifact and behavior.
- SQLite is the runtime source of truth; JSON/GEDCOM are exchange formats.
- Domain logic does not import UI, browser storage, or format-specific code.
- Planned cloud/community features attach through ports without changing core ownership of data.

## Stack

- Vite + React + TypeScript + Tailwind.
- React Router for workspace/editor/settings routes.
- TanStack Query for async repository cache; a small UI store only for selection, viewport, and panels.
- `@sqlite.org/sqlite-wasm` in a dedicated Worker with OPFS persistence.
- A hand-written SVG/DOM canvas for interaction/viewport over a plain layout Worker (ADR-018 supersedes the earlier React Flow + ELK intent).
- Zod/JSON Schema at I/O boundaries; React Hook Form for forms.
- Vitest and Playwright for unit/integration/browser coverage.

## Layers

1. `domain`: entities, invariants, relationship validation, use cases.
2. `application`: commands/queries and ports such as repositories, import/export, layout, diagnostics.
3. `infrastructure`: SQLite/OPFS, GEDCOM/JSON adapters, browser file APIs, workers.
4. `presentation`: routes, forms, graph nodes, panels, translations.

## Storage topology

- One catalog database stores local tree metadata and last-opened state.
- Each tree has an independent SQLite file to simplify isolation and export.
- One writer per tree is coordinated through Web Locks; other tabs receive change notifications through BroadcastChannel.
- Schema changes use numbered migrations. A failed migration preserves the original file and offers export/recovery; it never wipes automatically.
- App requests persistent storage and displays quota/backup status without promising that browser storage is permanent.

## Network policy

- Bundle fonts/icons/WASM/workers locally; no runtime CDN.
- Production CSP restricts network and script sources.
- Any future connector is explicit, scoped, disabled by default, and must never receive unrelated tree fields.
- Build UI exposes source repository and exact commit SHA.

## Deployment constraint

SQLite Worker/OPFS requires HTTPS and appropriate isolation headers. VPS `j2` must be audited before selecting Nginx/Caddy/container deployment. Audit is read-only and deployment is a separate decision.

---

# Target Domain and Data Model

Status: `TARGET`.

## Identity and metadata

- All exported entities use globally unique, stable IDs (UUIDv7 preferred).
- Every tree records `schema_version`, `created_at`, `updated_at`, optional `reference_person_id`, and source metadata.
- Imports retain external IDs and adapter-specific extension payloads for future round-trip and linked-source updates.

## Core entities

### `persons`

Stores names, gender/sex fields required by genealogy, living status, partial birth/death facts, contact data, biography, notes, and media references. Unknown values are null, not guessed.

### `family_unions`

Represents a family/partnership grouping rather than encoding spouse edges twice. It may contain one known parent, multiple partners over time, status, marriage/divorce facts, and notes.

### `family_partners`

Joins a person to a union with role/order and optional time range. This supports multiple marriages and incomplete historical records.

### `family_children`

Joins a child to a union with parentage type such as `BIOLOGICAL`, `ADOPTED`, `STEP`, `FOSTER`, or `UNKNOWN`, plus birth order when known. Sibling relationships are derived from shared family membership.

### `events` and `places`

Provide extensible facts for birth, death, marriage, burial, residence, and later Vietnamese cultural events without adding a new person column for every fact.

### `external_references` and `extension_payloads`

Preserve source system IDs, import batch, content hashes, and format-specific records that the canonical model does not yet understand.

## Required invariants

- No person can be their own parent, partner, or child.
- Parentage must not create an ancestor cycle.
- Foreign keys are enabled and enforced; deletes use explicit policies.
- Duplicate partner/child membership in the same union is rejected.
- Person creation and relationship creation are one transaction.
- Import is atomic and records warnings/provenance.
- Sensitive fields are classified so export filters can exclude them consistently.

## Partial dates

Dates must represent year-only, month/year, complete dates, approximate dates, ranges, and calendar/source text without inventing precision. The storage shape is decided in the schema ADR before implementation and mapped losslessly where the source format permits.

---

# Data Format Contracts

## Native JSON v1

Purpose: transparent, plaintext backup and exchange between Gia Phả installations.

Required envelope fields:

- `format`: stable identifier for Gia Phả native data.
- `formatVersion`: semantic format version.
- `exportedAt`, `appVersion`, `tree`, `entities`, `extensions`.
- Stable IDs and explicit relationship records; no UI-only state.

Rules:

- Publish JSON Schema with the application.
- Validate before mutation and reject unsupported major versions.
- Produce deterministic output for equal canonical data where practical.
- Preserve unknown extension namespaces on round-trip.
- Never execute or render imported HTML/scripts as trusted content.

## GEDCOM

- Import FamilySearch GEDCOM 5.5, 5.5.1, and 7.x.
- Export GEDCOM 7.x and a documented 5.5.1 compatibility profile.
- Preserve unknown/custom tags with source location and ownership.
- Report malformed lines, encoding repair, unsupported semantics, dropped media, and lossy mappings.
- Include the required FamilySearch GEDCOM NOTICE when implementation derives from the Apache-2.0 specification.

## Adapter contract

Each adapter implements detection, parse, validate, preview, import mapping, export mapping, and compatibility reporting. Adapters run locally in a Worker and must support cancellation and file-size limits.

## Privacy

All exports are plaintext by product decision. Before export, users choose scope and fields and receive a clear warning. Default sharing presets redact contact details, private notes, precise locations, and detailed facts about living people.

---

# Xưng hô (Kinship Address Terms)

Status: `TARGET`

Computes how a reference person addresses every other person in the tree, and how they
refer to themselves in return, using the address conventions of the branch the other
person belongs to.

Roadmap origin: `overview.md:39` and root `README.md:28` list "danh xưng" as a confirmed
post-MVP item. This document is its first specification. The regional-dialect layer
(Bắc / Trung / Nam) is new and was not covered by the original roadmap entry.

## 1. Problem

Vietnamese has no neutral third-person kinship vocabulary. The same person is `bác`,
`chú`, `cậu`, or `dượng` depending on which side of the family they sit on, whether they
are older or younger than the connecting parent, and which region the speaker's family
follows. A father's elder brother is `bác`; his younger brother is `chú`; a mother's
brother is `cậu` regardless of age in most of the country.

Two consequences drive this design:

- A label cannot be stored on a person. It is a function of the pair (viewer, target).
- The vocabulary is not uniform across a single family. A person with a Quảng Trị
  paternal line, a Hà Nội maternal line, and a southern spouse's family speaks three
  registers in one conversation and expects to see all three in one tree.

## 2. Model

```
address(ego, target) -> { call, selfRef, seniority, branches[], confidence }
```

Resolution runs in four stages. Each stage is independently testable and the boundaries
between them are the reason the dialect layer stays cheap to extend.

### Stage 1 — Path signature

Breadth-first search from `ego` over parent, child, and partner edges, recording the
traversed path. The result is normalized to a compact signature using standard kinship
notation, one letter per hop:

| Letter | Hop |
|---|---|
| `F` | father |
| `M` | mother |
| `S` | son |
| `D` | daughter |
| `B` | brother |
| `Z` | sister |
| `H` | husband |
| `W` | wife |

Sibling hops `B`/`Z` are derived (shared parent), not stored edges. Seniority is appended
where it changes the term: `e` for elder, `y` for younger, relative to the *connecting
relative*, not to ego.

Examples:

| Signature | Meaning | Term (Bắc) |
|---|---|---|
| `F` | father | bố |
| `FeB` | father's elder brother | bác |
| `FyB` | father's younger brother | chú |
| `FyBW` | wife of father's younger brother | thím |
| `MB` | mother's brother | cậu |
| `MZ` | mother's sister | dì |
| `WF` | wife's father | (see §4, borrowed register) |

Search is capped at `MAX_PATH_DEPTH` (default 4 hops) and returns the shortest path.
Ties break deterministically by a fixed hop-priority order so the same tree always
produces the same label. Beyond the cap the result is `DISTANT` and the UI falls back to
a generation-based term rather than guessing.

### Stage 2 — Seniority

`FeB` versus `FyB` decides `bác` versus `chú`, and getting it wrong is a social error, not
a cosmetic one. Seniority is resolved in strict priority order:

1. `family_children.birth_order` — authoritative when present (currently dead schema, see §6)
2. `birth_year`, then `birth_month`, then `birth_day` on `persons`
3. Otherwise `UNKNOWN`

`UNKNOWN` is a first-class result. It renders as `bác/chú (chưa rõ)` with a visible
warning affordance. The engine never guesses seniority — an unresolved case must be
visible so the user can fill in the missing date.

### Stage 3 — Branch membership

A *branch* is defined by a root person. Membership is:

- every descendant of the root, plus
- every person married into such a descendant, plus
- every person manually assigned to the branch

The manual layer is not an escape hatch, it is expected. Genealogy assembled from
acquaintance — which is what this data is — regularly includes people who must be
addressed correctly but sit under no common ancestor: distant kin, in-laws of in-laws,
family friends invited to a wedding. Rule-derived membership covers the common case and
manual assignment covers the rest.

A person may belong to more than one branch. The founder's own children belong to both
the paternal branch and the spouse's branch. Such nodes render both labels side by side
rather than picking a winner.

### Stage 4 — Rendering

A branch profile carries a region code and a language code. The signature from stage 1,
combined with the seniority from stage 2, is looked up in the dictionary for the target's
branch profile.

Every entry yields a **pair**, because Vietnamese address is reciprocal — you cannot say
what to call someone without also fixing what you call yourself:

```
FeB  ->  { call: "bác",  selfRef: "cháu" }
F    ->  { call: "bố",   selfRef: "con" }      // Bắc
F    ->  { call: "ba",   selfRef: "con" }      // Nam
F    ->  { call: "bọ",   selfRef: "con" }      // Trung, Quảng Trị
```

Three registers per entry:

| Register | Use |
|---|---|
| `spoken` | conversation, graph labels |
| `formal` | wedding invitations, printed documents |
| `reference` | talking *about* the person to someone else |

## 3. Regional profiles

Shipped profiles, keyed by region code:

| Code | Region | Notes |
|---|---|---|
| `BAC` | Miền Bắc | bố / mẹ; birth order counts from 1 (anh cả) |
| `TRUNG` | Miền Trung | bọ / mạ / o; sub-variants by province |
| `NAM` | Miền Nam | ba / má; birth order counts from 2 (anh Hai) |

The southern birth-order offset is a rendering rule attached to the profile, not a data
difference — the same third child is `anh Ba` in the south and `anh Ba` in the north only
by coincidence of the offset, and the engine must apply the profile's offset rather than
printing the raw ordinal.

Provincial sub-variants (Quảng Trị within `TRUNG`) override individual entries and inherit
the rest, so a new province is a short override table, not a new dictionary.

Language is the outermost case of the same mechanism: a branch profile whose language code
is not `vi` resolves against a different dictionary entirely, producing `uncle` / `grandma`
for a branch that married abroad.

## 4. Borrowed register (nhà vợ / nhà chồng)

When ego addresses a person in a spouse's branch, ego does not compute the term from their
own position. They adopt the spouse's term — "gọi thay ngôi". Ego calls the wife's maternal
uncle `cậu` because the wife does, despite having no blood path that would produce `cậu`.

Implementation: when the target's branch is a spouse-side branch, the signature is
recomputed with the spouse as ego, and the result is rendered in the spouse branch's
profile. The `selfRef` side of the pair still adjusts for ego's own generation.

## 5. Outputs

Three surfaces, all driven by the same resolver:

1. **Graph labels** — each node shows its address term under the name; the reference
   person is `anchorPersonId` in the Zustand store, already persisted and already backed
   by the `is_anchor` column.
2. **Flat list** — a sortable table of every relative with real name, address term,
   self-reference, branch, and a "seniority unknown" flag. Exportable, and the primary
   artifact for wedding planning.
3. **Invitation form** — the `formal` register, composed into the phrasing used on printed
   invitations.

## 6. Data gaps

The live application runs on the v1 flat model: `persons` plus `relationships` with
`PARENT_OF` / `SPOUSE` / `EX_SPOUSE` / `ADOPTED_PARENT_OF`. Schema v2 added
`family_unions`, `family_partners`, and `family_children` including `birth_order`, but
`src/db/families.ts` has no callers and those tables are unused by the UI and absent from
`src/db/types.ts`.

This does not block the feature. Everything stage 1 and stage 4 need exists in v1, and
stage 2 degrades to birth dates, which v1 has. `birth_order` becomes the authoritative
seniority source once the v2 model is wired up; until then the date fallback carries it,
and `UNKNOWN` covers the remainder.

New storage required:

```sql
branch_profiles      (id, name, region_code, language_code, parent_profile_id, notes)
branch_roots         (id, branch_profile_id, root_person_id)
person_branch_links  (person_id, branch_profile_id, source)  -- source: DERIVED | MANUAL
```

`person_branch_links` is a materialized cache of derived membership plus manual rows;
derived rows are recomputed when the graph changes, manual rows are never overwritten.

## 7. Constraints

- Data is incomplete by nature. Every field stays optional, nothing blocks entry, and a
  missing value produces a visible `chưa rõ` rather than a rejected form or a guess.
- Resolution is pure and synchronous over an in-memory adjacency map. No new worker.
- Dictionaries are data files, not code branches, and extend `src/i18n/` rather than
  introducing a second localization mechanism.
- Nothing leaves the browser (ADR-002).

## 8. Prior art

`analysis-giapha-os.md:15` records kinship-term computation in a competitor as the source
of the original roadmap idea. That implementation computes a single national register and
has no branch or dialect concept.

## 9. Open questions

- Provincial coverage for `TRUNG` beyond Quảng Trị is unscoped; the override mechanism
  exists but the tables do not.
- Whether the flat list should include affinal kin with no address term at all (people
  invited but not addressed by a kinship term) or exclude them.
- Whether `MAX_PATH_DEPTH` of 4 is sufficient for the founder's real tree, or whether the
  wedding list reaches further and needs a generation-based fallback sooner.

---

# Implemented Surface (2026-08-16)

`CURRENT` — verified by `npm run lint`, `npm run typecheck`, `npm test` (69 tests, 13 files, all passing).

## `src/kinship/` — XH-001, XH-002, XH-003

```
resolvePath(egoId, targetId, persons, relationships, maxDepth = MAX_PATH_DEPTH)
  => PathResult { signature, hops, distant }
compareSeniority(a, b)        => "ELDER" | "YOUNGER" | "UNKNOWN"
resolveAddress(profile, path, egoGender) => AddressResolution
birthOrderLabel(rank, profile)
withProvince(base, code, overrides)
REGION_PROFILES, BAC, TRUNG, NAM, TRUNG_QUANG_TRI
```

`AddressStatus` is `SELF | DISTANT | OK | UNKNOWN_SENIORITY | UNKNOWN_GENDER | NOT_FOUND`.
Both unknown states are returned rather than resolved to a plausible term, per ADR-013.

Sibling edges (`B`/`Z`) are derived inside `graph.ts` rather than traversed as two parent
hops, so signatures stay in the compact form the dictionaries key on (`FeB`, not `FSB`).
Lookup falls back to the marker-stripped key when a term is seniority-invariant (`MB`,
`MZ`), and returns `UNKNOWN_SENIORITY` only where seniority genuinely changes the word.

Dictionary coverage: ascending and lateral kin (bác, chú, cô, dì, cậu, mợ, thím, dượng),
grandparents, direct affinal kin (`WF`, `WM`, `HF`, `HM`), own siblings (`eB`, `eZ`, `yB`,
`yZ`), own children (`S`, `D`), and grandchildren (`SS`, `SD`, `DS`, `DD`).

## `src/db/` — XH-004

Migration v4 (`LATEST_SCHEMA_VERSION` is now 4) adds `branch_profiles`, `branch_roots`,
`person_branch_links`. `recomputeDerivedMembership` deletes only rows with
`source = 'DERIVED'`, so manual assignments survive recomputation — the guarantee ADR-012
exists for. Membership derives from the v1 `relationships` table, not the dead v2 union
tables; revisit if v2 is ever wired up.

## `src/io/gedcom/` — IO-002 import half

```
importGedcom(text)      => GedcomImportResult { persons, relationships, extensions, loss }
parseGedcomDate(value)  => GedcomDate
decodeAnsel(bytes)
```

Tokenizer handles `CONT`/`CONC`, xref declarations versus pointer values, and ANSEL /
UTF-8 / UTF-16 encodings. `FAM` maps into the v1 flat `relationships` model, so union-level
facts GEDCOM can express are flattened. Unknown `_XXXX` tags are retained with source
location. Malformed lines land in the loss report instead of throwing.

**Not wired to anything.** It returns data; no database write and no UI exist yet.

## Gotchas for the next session

- `resolveAddress` takes three arguments. Ego gender is required because `selfRef` for a
  younger sibling depends on it (anh versus chị), expressed as `DictSelfRef`.
- The kinship engine is pure and takes plain arrays. It does not read the database; a
  caller must load persons and relationships and pass them in.
- Deep spouse-branch borrowing ("gọi thay ngôi" beyond direct in-laws) is still unbuilt. It
  needs the XH-004 branch layer joined to the engine, which no code does yet.
- Quảng Trị overrides exactly one entry (`FM` → mệ) as a mechanism demo. Real provincial
  vocabulary must come from the founder, not be invented.
