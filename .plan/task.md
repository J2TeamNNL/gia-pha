# Task Backlog

Status values: `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `SUPERSEDED`.

| ID | Status | Priority | Task | Acceptance criteria |
|---|---|---:|---|---|
| DOC-001 | DONE | P0 | Rebuild AI knowledge base | Entry map, overview, architecture, domain, formats, flows, ADRs, review, tasks, and changelog agree. |
| DOC-002 | DONE | P0 | Align documentation to in-place implementation scope | README, overview, roadmap, task backlog, ADRs, audit record, and changelog identify `gia-pha` as the active product repository and preserve the superseded greenfield decision. |
| OPS-001 | DONE | P0 | Audit VPS `j2` read-only | Sanitized OS/resources, runtime/proxy/TLS/port, and header findings are recorded without changes; deployment is blocked pending administrator-controlled HTTPS/isolation-header configuration and a separate implementation task. |
| REP-001 | SUPERSEDED | P0 | Create greenfield repo | Superseded by ADR-010; no sibling `coi-nguon` repository or repository rename will be created. |
| FND-001 | DONE | P0 | Scaffold quality baseline in `gia-pha` | Typecheck, lint, unit tests, production build, and Playwright pass locally and in GitHub Actions; the target runtime migration remains separately tracked. |
| FND-002 | DONE | P0 | Implement local database runtime | SQLite Worker and OPFS persist across reload; unsupported environments fail clearly, never use silent transient storage. |
| FND-003 | DONE | P0 | Implement multi-tree catalog | Users can create, rename, open, and delete isolated trees; destructive actions require confirmation. |
| DOM-001 | DONE | P0 | Implement domain schema and migrations | Constraints and transactions cover people, unions, partners, children, dates, provenance, and schema versions. |
| DOM-002 | DONE | P0 | Implement genealogy validation | Reject self-links, duplicate memberships, invalid parent cycles, and dangling references with actionable errors. |
| UI-001 | DONE | P0 | Build workspace and editor shell | Mobile/desktop workspace, search, side panel, and reference-person selection are keyboard accessible. |
| UI-002 | DONE | P0 | Build graph rendering | Correct union/parent-child graph, focus/depth controls, pan/zoom, worker layout, and 500-visible-node guard. |
| IO-001 | TODO | P0 | Publish Native JSON v1 | Versioned JSON Schema, validator, deterministic export, and import/export round-trip tests exist. |
| IO-002 | TODO | P0 | Implement GEDCOM adapters | Supported versions import/export with fixtures; unknown extensions survive or appear in a loss report. |
| PRIV-001 | TODO | P0 | Enforce local-only privacy | No telemetry or automatic report; network tests prove family payloads never leave the browser. |
| PERF-001 | TODO | P1 | Meet scale target | CRUD/search/import benchmarks pass with 10,000 people and graph stays usable with 500 visible nodes. |
| REL-001 | TODO | P1 | Prepare first public release | Changelog, version, build SHA, source link, browser support, and privacy limitations are visible. |

## Definition of done

A task is done only when implementation, tests, relevant documentation, and changelog are updated in the same change.
