# Existing Docs Inventory — gia-pha

Sources read: `.plan/` (all files + `decisions/`, `operations/`, `reviews/`), root `README.md`, `.agents/rules/rule.md`, `.github/workflows/ci.yml`, `git log --oneline -30`.

## 1. Product vision & scope

Per `.plan/overview.md` (status `TARGET`, i.e. describes the product being implemented, not the current prototype):

- **Vision**: "Gia Phả is an open-source, privacy-first family tree application for Vietnamese families. Non-technical users can use a public website, while technical users can clone and self-host the same application." (`overview.md:7`)
- Hosted site distributes static assets only; all family data lives/is processed in-browser; no account, no server-side family DB.
- **Primary audience**: tree owner manages one or more trees; relatives mainly view exports; Vietnamese terminology/genealogy is the default, English secondary; modern mobile/desktop browsers.
- **Core MVP boundary** (`overview.md:29-31`): local workspace, family graph, CRUD, search, native JSON, GEDCOM, diagnostics, tests.
- **Core MVP success criteria** (`overview.md:18-25`): multi-tree local persistence; full CRUD+search+nav; multi-union/divorce/biological-adoptive/unknown-parent/half-sibling modeling; lossless-ish JSON+GEDCOM import/export; responsive focused graph (10k people, ≤500 visible nodes); zero automatic telemetry/network.
- **Explicitly not planned for core** (`overview.md:52`): central family-data server, mandatory login, realtime collaboration, automatic merge, community discovery, analytics, session replay.
- **Post-MVP roadmap** — confirmed 2026-07-12, restored from founder's original list (`overview.md:33-48`, mirrored in root `README.md:22-36`): Google Drive backup/sync, PWA/offline, Vietnamese kinship-term computation (danh xưng) from reference person, lunar calendar + Can Chi + ngày giỗ reminders + Google Calendar sync, child-name suggestions avoiding ancestor clashes, Tử vi/lịch kỵ advisory date warnings (explicitly "no superstition push"), CCCD/ID-card OCR entry, tree-diagram image export, Google Photos embedding per person (open question flagged: embedded media vs. JSON export portability), Google Maps directions, GEDCOM import/export + adapters, manual source linking / reviewed merge suggestions with human approval + rollback.
- Changelog entry `2026-07-12 - Roadmap realignment` (`changelog.md:222-240`) explicitly confirms: GEDCOM stays in Future (not core... note: task.md lists IO-002 GEDCOM as P0 TODO — see Contradictions), Drive sync stays Future, and a "family-social-network V3" idea was **dropped** from the roadmap (not deferred).
- **Naming/licensing** (`overview.md:54-58`): repo/product id `gia-pha`, display name **Gia Phả**, active repo `J2TeamNNL/gia-pha` (public), license target AGPL-3.0.

## 2. Delivery status (task.md vs git log)

`.plan/task.md` status table (Status values: TODO/IN_PROGRESS/BLOCKED/DONE/SUPERSEDED):

| ID | Status | Task |
|---|---|---|
| DOC-001 | DONE | Rebuild AI knowledge base |
| DOC-002 | DONE | Align docs to in-place implementation scope |
| OPS-001 | DONE | Audit VPS `j2` read-only |
| REP-001 | SUPERSEDED | Create greenfield repo (superseded by ADR-010) |
| FND-001 | DONE | Scaffold quality baseline (lint/typecheck/test/build/Playwright/CI) |
| FND-002 | DONE | SQLite Worker + OPFS runtime |
| FND-003 | DONE | Multi-tree catalog (create/rename/open/delete) |
| DOM-001 | DONE | Domain schema + migrations |
| DOM-002 | DONE | Genealogy validation |
| UI-001 | DONE | Workspace/editor shell (search, side panel, reference-person) |
| UI-002 | DONE | Graph rendering (focus/depth/pan/zoom/worker layout/500-node guard) |
| IO-001 | TODO | Native JSON v1 (schema, validator, round-trip tests) |
| IO-002 | TODO | GEDCOM adapters |
| PRIV-001 | TODO | Enforce local-only privacy (no telemetry, network tests) |
| PERF-001 | TODO | Meet 10k-person / 500-node scale target |
| REL-001 | TODO | First public release prep (changelog, version, SHA, browser support) |

Cross-check against `git log --oneline -30`:
```
7d4cb9d UI-002: Render the family graph with worker layout, pan/zoom, and depth controls
899c4a8 Restore the original product vision as the confirmed post-MVP roadmap
be1e084 UI-001: Add keyboard-accessible member search and reference-person selection
0af0d56 Migrate to Vite + SQLite-WASM/OPFS runtime and fix review findings
8ed7c2a wip
640303f wip
fe83ce9 Update README.md
4e05006 Update .gitignore
3b9925f init
ea361d3 Initial commit
```
Commits `0af0d56` (FND-002/FND-003/DOM-001/DOM-002 bundled — matches changelog's single "Migrate to Vite..." commit covering multiple task IDs), `be1e084` (UI-001), `899c4a8` (roadmap doc realignment, no code), `7d4cb9d` (UI-002) all match task.md's DONE claims and changelog dates (2026-07-11 for the bundled migration work, 2026-07-12 for UI-001/roadmap/UI-002). No commit contradicts a DONE claim; IO/PRIV/PERF/REL tasks have no corresponding commits, consistent with TODO. `8ed7c2a`/`640303f` "wip" and `ea361d3`/`3b9925f`/`fe83ce9`/`4e05006` predate the `.plan` rewrite and correspond to the legacy prototype reviewed in `reviews/2026-07-11-legacy-review.md`.

## 3. Decisions already made (`.plan/decisions/README.md`)

| ID | Status | Decision (one line) |
|---|---|---|
| ADR-001 | Superseded by ADR-010 | Build `coi-nguon` greenfield repo, keep `gia-pha` as reference |
| ADR-002 | Accepted | Hosted app is local-only, zero telemetry, no account/backend |
| ADR-003 | Accepted | SQLite WASM/OPFS as runtime store; JSON/GEDCOM only at boundaries |
| ADR-004 | Accepted | Model unions + child membership instead of symmetric spouse edges |
| ADR-005 | Accepted | React Flow + ELK worker, focused rendering |
| ADR-006 | Accepted | All exports plaintext with warnings/privacy filters (encryption optional later) |
| ADR-007 | Accepted | GEDCOM adapters preserve unknown extensions, report loss |
| ADR-008 | Accepted | Merge/community linking is future work; core preserves stable IDs/provenance only |
| ADR-009 | Accepted | License `gia-pha` AGPL-3.0 |
| ADR-010 | Accepted | Continue in existing public `gia-pha` repo; replace prototype modules in place; no greenfield/rename |

Change process rule: new ADR on decision change; mark old row Superseded and link both; never rewrite history.

## 4. Competitor analysis takeaways

- **`analysis-AncestorTree.md`**: Next.js 16/React 19/Tailwind/Radix; Electron desktop uses `sql.js` (WASM SQLite) — validates the local-first WASM SQLite direction, file syncs to Drive. Vietnamese culture features praised: lunar calendar, chi/branch grouping, "Cầu đương" (ancestor-worship duty rotation via DFS), scholarship funds, family conventions, strong multi-marriage handling. Strong RLS/security and SDLC docs. Weakness: web version still needs Supabase; project's own plan is to do web-native WASM SQLite instead of requiring a desktop app. Conclusion: learn schema design (people/families tables) from this one; learn lunar calendar/danh xưng from giapha-os; learn UI/animation from Gia-Pha-Dien-Tu.
- **`analysis-Gia-Pha-Dien-Tu.md`**: Next.js 16 App Router, Zustand+React Query, Framer Motion, Supabase backend; custom SVG/BFS tree-drawing algorithm. Strengths: very polished UI/animation, auto-collapse of distant generations (node culling), contribution/approval workflow (user proposes, admin approves), intuitive `people`/`families` (father_handle/mother_handle/children array) data model. Weaknesses: fully dependent on Supabase (third-party risk); custom layout algorithm doesn't scale to complex structures (divorce/polygamy/adoption) — informs the project's choice of a proper graph library instead of hand-rolled layout.
- **`analysis-giapha-os.md`**: Next.js 16 App Router, Tailwind, Framer Motion, Supabase, `jspdf`/`html-to-image` for export, `lunar-javascript` for lunar dates. Strengths: kinship-term (danh xưng) auto-computation, strong lunar/solar conversion + ngày giỗ tracking via `lunar-javascript` (flagged as "should bring into our project"), both Tree and Mindmap view modes, exports to JSON/CSV/GEDCOM/PDF/image. Weakness: same Supabase dependency, not offline-first, doesn't fit the project's local-first + lightweight PWA direction.

## 5. Documentation conventions in use

- **Entry point / reading order**: `.plan/README.md` is mandatory entrypoint, prescribes a numbered reading order (overview → decisions → 01-architecture → 02-database-schema → data-formats → 03-ux-workflow/flow → plan/task → changelog).
- **Numbering**: architecture/schema/UX docs are numbered `01-`, `02-`, `03-` prefixes; other docs (`overview.md`, `plan.md`, `task.md`, `flow.md`, `data-formats.md`, `changelog.md`) are unnumbered by topic name. `analysis-*.md` share a common prefix for the three competitor write-ups. No version numbers embedded in filenames.
- **Status tagging convention**: docs open with an explicit `Status: TARGET` (or `CURRENT`/`DONE`/`BLOCKED`) line to disambiguate implemented vs. planned vs. aspirational content — used in `overview.md`, `01-architecture.md` (implied via header), `02-database-schema.md`, `plan.md`, `operations/vps-audit.md`. This CURRENT/TARGET/FUTURE distinction is itself a mandated documentation rule (`.plan/README.md:25`).
- **No YAML front-matter** on any `.plan/*.md` file (plain `# Title` + `Status:` line where present). The only file with YAML front-matter in the repo is `.agents/rules/rule.md` (`trigger: model_decision`).
- **Task backlog**: single markdown table in `task.md` with columns ID/Status/Priority/Task/Acceptance-criteria; status enum is TODO/IN_PROGRESS/BLOCKED/DONE/SUPERSEDED; task IDs use short category prefixes (DOC-, OPS-, REP-, FND-, DOM-, UI-, IO-, PRIV-, PERF-, REL-).
- **Changelog format** (`changelog.md`): reverse-chronological `## YYYY-MM-DD - Title` sections, each with fixed subsections **What / Why / Impact / References** (References cites file paths). Explicit rule: `.plan/README.md:27` — "Every completed task must update task.md and append a changelog entry containing What, Why, Impact, and References."
- **Decision log** (`decisions/README.md`): single markdown table ID/Status/Decision/Reason, ADR IDs sequential `ADR-00N`; supersession is done by adding a new ADR and marking the old row's Status "Superseded by ADR-0NN" rather than deleting it.
- **Reviews / operations**: dated one-off files under `reviews/` (`2026-07-11-legacy-review.md`) and `operations/` (`vps-audit.md`), free-form structure (Summary/Severity headings for review; Rules/Checklist/Findings/Recommendation for audit).
- Language convention: root `README.md` is Vietnamese; `.plan/` docs are English prose except explicit Vietnamese terms (danh xưng, ngày giỗ, etc.) — matches the stated rule "Product prose may be Vietnamese; API names, schemas, and code identifiers remain English" (`.plan/README.md:29`).
- **Go-forward convention (user-mandated, 2026-08-16)**: all project markdown stays in the existing `.plan/` tree — reports go to `.plan/reports/`. No `docs/`, `plans/`, or `.docs/` directories. (An earlier `.docs/` instruction during the same session was reverted; this report was moved from `.docs/reports/` to `.plan/reports/`.)

## 6. Agent rules (`.agents/rules/rule.md`)

Full content (short, single file):
- Front-matter: `trigger: model_decision`.
- Mandates `.plan/README.md` as **the** entrypoint/source-of-truth map for all AI agents.
- Three goals: context awareness (know done/in-progress/next), history preservation (running log of changes/decisions/progress), AI handoff (make state legible after context resets).
- Workflow: at session start read `README.md`, `overview.md`, `task.md`, and relevant ADRs; during task update `task.md` for in-progress items; when finishing, append to relevant files, update `changelog.md` with What/Why/Impact/References, keep `overview.md`/`plan.md` accurate, **never describe TARGET/FUTURE behavior as CURRENT**.

This is the only agent-rules file (`.agents/` has no other subdirectories/files). Any future root CLAUDE.md must not contradict: the `.plan/README.md`-as-entrypoint mandate, the CURRENT/TARGET/FUTURE distinction, and the changelog's mandatory What/Why/Impact/References structure.

`.github/workflows/ci.yml` (only file in `.github/`): single `quality` job on push/PR, Node 24, runs `npm ci` → lint → typecheck → test (Vitest) → build → Playwright install/chromium → `test:e2e`. `NEXT_TELEMETRY_DISABLED: "1"` env is a leftover from the pre-Vite Next.js baseline (per changelog, Next/Turbopack was later replaced by Vite in FND-002 — this CI file may be stale, see Contradictions).

## 7. Vietnamese kinship terminology / xưng hô / dialects / localization

Direct/verbatim mentions found:
- `overview.md:39` (post-MVP roadmap item): "Vietnamese kinship terms computed from the reference person (danh xưng)."
- Root `README.md:28`: "**Tính toán danh xưng**: tự động xác định xưng hô (Anh/Em/Bác/Cháu…) từ hướng nhìn người tham chiếu." (auto-compute forms of address — Anh/Em/Bác/Cháu — relative to the reference person's viewpoint).
- `analysis-giapha-os.md:15`: "**Tính toán danh xưng (Kinship):** Tự động xác định cách gọi tên (Bác, Chú, Cô, Dì...). Điều này rất thiết thực với văn hóa Việt Nam." (learned-from note, source of the roadmap idea).
- `analysis-AncestorTree.md:15-19`: notes "Cầu đương" (ancestor-worship duty-rotation feature) and "Vinh danh, Quỹ khuyến học, Hương ước dòng họ" (honor rolls, scholarship funds, clan conventions) as Vietnamese-culture features observed in a competitor — not adopted into gia-pha's own roadmap list, just cited as background.
- `03-ux-workflow.md:35`: "Vietnamese is the default product language; English remains supported through complete dictionaries rather than scattered conditionals." — this is the only localization/i18n implementation guidance; no mention of regional dialects (Bắc/Trung/Nam) anywhere in the docs.
- No document defines the actual xưng hô computation rules/algorithm, no dialect handling, no i18n architecture beyond the one sentence above. `danh xưng` remains an unimplemented, unscoped roadmap idea (post-MVP), not a current design.

## Contradictions / stale docs

- **IO-002 (GEDCOM) priority vs. roadmap tier**: `task.md` lists `IO-002 | TODO | P0 | Implement GEDCOM adapters` as core MVP P0 work, and `overview.md`'s Core MVP boundary also lists "GEDCOM" (`overview.md:31`). But the roadmap-realignment changelog entry (2026-07-12) states "GEDCOM stays in Future" as confirmed with the founder, and `overview.md`'s Future list separately repeats "GEDCOM import/export and additional adapters" (`overview.md:47`). GEDCOM is thus listed as both a P0 MVP task/boundary item and a confirmed-Future roadmap item — an unresolved scope conflict future docs work should flag to the founder rather than silently pick one side.
- **`.github/workflows/ci.yml`**: still sets `NEXT_TELEMETRY_DISABLED: "1"`, a Next.js-specific env var, even though changelog (`2026-07-11 - FND-002`) records the build migrating from Next/Turbopack to Vite. Likely stale/dead config line.
- **`README.md` "Trạng thái hiện tại"** claims CI/lint/typecheck/build/Playwright "đã chạy" (already run) and describes catalog/search/side-panel/validation as present — this matches task.md DONE items through UI-002, so it is currently accurate, but it is written in present-tense CURRENT voice inside a repo whose `.plan/README.md` doctrine otherwise insists on strict CURRENT/TARGET separation elsewhere; worth watching as UI/DOM work continues, since README does not carry a "last verified" date the way `.plan` docs do.
- **Legacy review vs. current runtime**: `.plan/reviews/2026-07-11-legacy-review.md` describes the pre-migration Next.js/sql.js/IndexedDB prototype (schema auto-reset destroying data, non-atomic person/relationship creation, flat canvas ignoring relationships, etc.). All of these were superseded by the FND-002/FND-003/DOM-001/DOM-002/UI-002 work per changelog — the review is explicitly historical (`.plan/README.md:8` already flags it as such) and should not be read as current-state; no action needed, just don't cite it as present-tense fact.
- No internal contradiction found among `01-architecture.md`, `02-database-schema.md`, `03-ux-workflow.md`, `flow.md`, `data-formats.md`, decisions log, or changelog — these are mutually consistent and consistently marked `TARGET`.

## Unresolved questions for the team

- Should the GEDCOM P0/Future contradiction be resolved by moving IO-002 out of `task.md`'s P0 tier, or by re-confirming GEDCOM as in-scope for MVP (overriding the 2026-07-12 changelog note)?
- Is the stale `NEXT_TELEMETRY_DISABLED` CI env var intentional (harmless leftover) or should it be removed as part of any CI doc/config cleanup?
