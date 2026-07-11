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
