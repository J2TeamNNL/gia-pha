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
