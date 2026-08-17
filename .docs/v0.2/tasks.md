<!-- snapshot: v0.2 | current | updated: 2026-08-16 -->

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
| DB-001 | DONE | P0 | Add a transactional bulk write path | One `batch` worker command commits many statements under `BEGIN IMMEDIATE`; `bulkImport` mints ids, resolves caller-supplied `externalId` references, validates every relationship before sending, and rolls the whole batch back on the first offending row. |
| ENT-001 | DONE | P0 | Accept a pasted list from a spreadsheet | A pasted table maps to people and parent/spouse links, shows a per-row preview with errors before anything is written, and commits through `DB-001` in one transaction. |
| ENT-002 | DONE | P0 | Speed up in-app entry | Adding a relative keeps the form open for the next one, supports keyboard-only completion, and defaults the relationship from the person in focus. |
| ENT-004 | DONE | P0 | Fix what a real run of the app exposed | Birth and death year are on the quick form, one full-name field replaces three, the toolbar fits a phone, and the reference person is marked on the graph. |
| IO-001 | TODO | P2 | Publish Native JSON v1 | Versioned JSON Schema, validator, deterministic export, and import/export round-trip tests exist. |
| IO-002 | IN_PROGRESS | P2 | Implement GEDCOM adapters | Supported versions import/export with fixtures; unknown extensions survive or appear in a loss report. Back in MVP scope 2026-08-16 (ADR-015). **Import path done** (`src/io/gedcom/`, parser + mapping + loss report, not yet wired to the DB or UI); **export not started**. |
| PRIV-001 | TODO | P0 | Enforce local-only privacy | No telemetry or automatic report; network tests prove family payloads never leave the browser. |
| PERF-001 | TODO | P1 | Meet scale target | CRUD/search/import benchmarks pass with 10,000 people and graph stays usable with 500 visible nodes. |
| REL-001 | TODO | P1 | Prepare first public release | Changelog, version, build SHA, source link, browser support, and privacy limitations are visible. |
| XH-001 | DONE | P1 | Implement kinship path resolution | BFS from ego records the shortest path to a target within `MAX_PATH_DEPTH`, normalizes it to a signature, breaks ties deterministically, and returns `DISTANT` beyond the cap. |
| XH-002 | DONE | P1 | Implement seniority resolution | `birth_order`, then birth date fields, then `UNKNOWN`; comparison is against the connecting relative, and an unresolved case never renders a guessed term. |
| XH-003 | DONE | P1 | Build regional address dictionaries | `BAC`, `TRUNG`, `NAM` dictionaries return gọi/xưng pairs in spoken, formal, and reference registers; provincial overrides inherit their parent profile; southern birth-order offset applies. |
| XH-004 | DONE | P1 | Implement branch profiles and membership | Branch roots derive descendant and married-in membership, manual assignment survives recomputation, and multi-branch people resolve to more than one label. |
| XH-005 | DONE | P0 | Surface address terms in the workspace | Graph nodes and the side panel show the term for the current reference person, multi-branch nodes show both, and unknown seniority is visibly flagged. |
| XH-006 | DONE | P0 | Ship the relative list and invitation output | Sortable exportable table of every relative with term, self-reference, branch, and unknown-seniority flag, plus the formal register composed for printed invitations. |
| XH-007 | DONE | P0 | Join the kinship engine to branch profiles | Given ego and a target, the join loads the target's branch profiles and returns one address resolution per branch, reusing the persons and relationships already held in the store rather than re-querying. |
| ENT-003 | DONE | P0 | Tell the branches apart on the tree | Each branch carries a distinct accent, cards show their branch's accent, and a legend names them. |
| XH-008 | DONE | P0 | Build the branch setup interface | A user can name a branch, choose its region, pick root people, and manually assign anyone derivation misses, without leaving the app. |

## Definition of done

A task is done only when implementation, tests, relevant documentation, and changelog are updated in the same change.
