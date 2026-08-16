<!-- snapshot: v0.1 | frozen: 2026-07-12 | superseded by v0.2 -->

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
- React Flow for interaction/viewport and ELK in a Worker for layered layout with union nodes and ports.
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
