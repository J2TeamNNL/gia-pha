<!-- snapshot: v0.2 | current | updated: 2026-08-16 -->

# Project Changelog

This log records both implementation and durable documentation changes. Dates use `YYYY-MM-DD`.

## 2026-08-16 - Browser proof for the whole xưng hô flow, and a CSV export that cannot run

**What**

- `e2e/xung-ho.spec.ts` drives the founder's actual path in a real browser: paste a family,
  make one person the reference, read `bác` off the uncle's card, open the relative list,
  fill in an invitation wording, download the CSV, then create a Quảng Trị branch and see it
  in the graph legend.
- CSV and TSV cells opening with `=`, `+`, `-`, or `@` are prefixed with an apostrophe so a
  spreadsheet treats them as text.
- Both region pickers in branch setup carry a `role="group"` and an `aria-label`.

**Why**

- Changing `QuickAddForm` to read its placeholders from the dictionaries broke two existing
  Playwright selectors, and that was not caught until e2e ran — the unit tests and the build
  were both green over a red CI. The new spec exists so the screens built this session cannot
  break the same silent way.
- Names are user-entered and an exported list gets shared with relatives; a name beginning
  with a formula character would execute when the file is opened. Flagged by an automated
  review of the previous commit.
- The two region pickers rendered identical button names with nothing to tell them apart,
  which is a real problem for anyone navigating by screen reader, not only for the test.

**Impact**

- `npm run test:e2e` covers 6 specs; lint, typecheck, 125 unit tests, and the build pass.
- A name legitimately starting with `-` now exports with a leading apostrophe visible in the
  cell. That is the accepted cost of the file not executing.

**References**

- `e2e/xung-ho.spec.ts`, `e2e/home.spec.ts`, `src/lib/exportFile.ts`
- `src/components/BranchSetup.tsx`

## 2026-08-16 - Branches are distinguishable at a glance

**What**

- `ENT-003`: `src/lib/branchColor.ts` assigns a distinct accent per branch by list position;
  `PersonCard` carries it as a thin stripe, and the graph shows a legend naming each branch.

**Why**

- The founder listed "cây dễ nhìn hơn" among what makes entry easier to hold in mind. Once a
  tree spans a paternal line, a maternal line, and a spouse's family, the sides are the first
  thing the eye needs to separate.
- Colour is assigned per branch rather than per region, because two branches from the same
  region would otherwise render identically — which is exactly the case a Vietnamese tree hits
  when both sides come from the north.

**Impact**

- 122 tests across 20 files; lint, typecheck, and build pass.

**References**

- `src/lib/{branchColor.ts,branchColor.test.ts}`, `src/components/{PersonCard.tsx,GraphView.tsx}`
- `tasks.md` `ENT-003`

## 2026-08-16 - The relative list, and an invitation wording the founder writes

**What**

- `XH-006`: `src/kinship/relativeList.ts` — `buildRelativeRows` produces one row per person
  per branch with the term, the self-reference, the branch, and the rank; `generationOf`
  reads rank off the path signature; `sortRelativeRows` orders by branch then elders first,
  then oldest first within a rank.
- `src/components/RelativeList.tsx` — the table, a register switch (spoken / formal /
  reference), sorting, and export.
- `src/lib/exportFile.ts` — CSV (with a BOM so Excel reads Vietnamese), TSV, JSON, and plain
  text, built in memory and handed to the browser through an object URL.
- The invitation wording is a template the user writes — `{call}` and `{name}` are filled in
  per relative — with a copy-all button.

**Why**

- The default order matches how invitations are actually written: one branch at a time,
  elders before juniors. Confirmed with the founder rather than assumed.
- The wording is not shipped as a fixed sentence. Every family phrases an invitation its own
  way, so guessing would produce something that reads wrong on a printed card; the founder
  writes the sentence once and the list fills in the names.
- Four export formats because the list has to reach a printer, a spreadsheet, and a phone.

**Impact**

- Relatives whose term is unresolved appear in the table marked `chưa rõ`, and are left out
  of the invitation output rather than being printed with a guessed term.
- 119 tests across 19 files; lint, typecheck, and build pass.

**References**

- `src/kinship/{relativeList.ts,relativeList.test.ts}`, `src/components/RelativeList.tsx`
- `src/lib/{exportFile.ts,exportFile.test.ts}`, `tasks.md` `XH-006`

## 2026-08-16 - Address terms visible while you enter the tree

**What**

- `XH-005`: graph cards carry the term the reference person uses, rendered as a badge above
  the name; the side panel lists every applicable branch with the full gọi/xưng pair.
- `src/components/kinshipLabel.ts` — `usePersonLabels` resolves the whole visible set in one
  pass, so a card render never triggers its own traversal; `labelFor` picks the first branch
  that resolved and distinguishes "no term applies" from "data is missing".
- `KinshipRows` shows a `gọi thay ngôi` line naming whose position the term came from.
- The default dialect now follows the last person entered rather than a fixed setting; the
  explicit picker in branch setup is the fallback, and its hint says so.

**Why**

- The founder's stated reason for the feature is being able to picture and remember who is
  who *while entering the tree*, so the term has to sit on the card during entry rather than
  only in a report read later.
- A card is 160px wide, which fits one short word. The badge carries the first branch and a
  dot marks that more exist; the panel is where a multi-branch person shows every answer.
- An unresolved term renders as `chưa rõ` in amber, visibly different from a relative who is
  simply too distant to have one. Only the first is a prompt to supply missing data.

**Impact**

- Cards grow by roughly 18px when a term applies, which lengthens a deep tree slightly.
- 105 tests across 17 files; lint, typecheck, and build pass.

**References**

- `src/components/{kinshipLabel.ts,kinshipLabel.test.ts,KinshipRows.tsx,PersonCard.tsx,GraphView.tsx,SidePanel.tsx}`
- `src/store/treeStore.ts` (`lastEnteredPersonId`), `tasks.md` `XH-005`

## 2026-08-16 - Branch setup, reachable from the app at last

**What**

- `XH-008`: `src/components/BranchSetup.tsx` — create, rename, and delete a branch; pick its
  region and province; add root people and hand-assigned members through a shared
  `PersonPicker`; recompute derived membership; and set the default region.
- `src/lib/province.ts` normalizes a typed province name to the code a dialect variant is
  keyed by, so "Quảng Trị", "quang tri", and "QUẢNG TRỊ" all reach the same dictionary.
- The editor states plainly whether the chosen province has its own words or falls back to
  the region's shared ones.

**Why**

- `XH-004` shipped a repository with no interface; without this screen no branch can exist,
  so nothing downstream can render a regional term at all.
- Province is a free-text field rather than a dropdown. Vietnam's provinces were merged in
  2025 and a family record's quê quán is routinely written with the older name, so a curated
  list would be both stale and wrong for the actual use. Typing any name works; only the
  names with authored dialect data change the words, and the UI says which is which.

**Impact**

- Only `QUANG_TRI` currently has authored overrides. Every other province inherits its
  region's words, and the editor labels that rather than implying a dialect exists.
- 101 tests across 16 files; lint, typecheck, and build pass.

**References**

- `src/components/{BranchSetup.tsx,PersonPicker.tsx}`, `src/lib/province.ts`
- `src/app/page.tsx`, `tasks.md` `XH-008`

## 2026-08-16 - The kinship engine now knows which dialect to speak

**What**

- `XH-007`: `src/kinship/branchContext.ts` — `resolveBranchAddresses(ego, target, context)`
  returns one resolution per branch the target belongs to, each rendered in that branch's
  regional profile, and falls back to a user-chosen default region for anyone in no branch.
- Deep "gọi thay ngôi": when the target sits in a branch ego does not belong to, the term is
  resolved from a spouse who does belong to it, and the result records `viaPersonId`.
- Schema migration v5 adds `branch_profiles.province_code`, so a branch can select a
  provincial variant such as `TRUNG:QUANG_TRI` rather than only a region.
- `src/db/addressContext.ts` loads every profile and membership row in two queries, and
  `src/components/useAddressContext.ts` assembles the context from what the store already
  holds, so resolving a term costs no database roundtrip.
- The store gains `branchProfiles`, `branchLinks`, and a persisted `defaultRegion`.

**Why**

- The resolver and the branch repository both landed in the previous session and nothing
  connected them; every downstream feature needs this join first.
- A tree assembled from one family reaches across regions — a Quảng Trị paternal line, a
  Hà Nội maternal line, a southern spouse's family — and each is addressed in its own
  register at the same time. One resolution per branch is the only honest answer.
- `defaultRegion` is a stated user choice rather than a hidden constant, because a wrong
  default would silently render wrong terms for everyone not yet assigned to a branch.

**Impact**

- `LATEST_SCHEMA_VERSION` is now 5; the migration is additive and forward-only.
- `schema.test.ts` no longer hardcodes the migration count, so future migrations do not
  require editing three assertions.
- 101 tests across 16 files; lint, typecheck, and build pass.

**References**

- `src/kinship/{branchContext.ts,branchContext.test.ts}`, `src/db/addressContext.ts`
- `src/components/useAddressContext.ts`, `src/db/schema.ts` (v5), `tasks.md` `XH-007`

## 2026-08-16 - Faster in-app entry, and siblings that actually link

**What**

- `ENT-002`: `QuickAddForm` gains a "Lưu và thêm tiếp" action (also `Ctrl`/`Cmd`+`Enter`)
  that saves, keeps the surname, gender, and relationship, clears the given name, and
  returns focus there — so a run of children is typed without touching the mouse.
- The relationship to the person in focus is now shown and editable in the form rather than
  being fixed by however the form was opened, and defaults from the selected person.
- `linksForRelation` in `src/db/bulk.ts` turns that choice into edges, and the form commits
  the person and the edges through `bulkImport` in one transaction.
- `QuickAddForm` now reads every string from the i18n dictionaries, and offers `UNKNOWN`
  gender as an explicit choice.

**Why**

- Entering 200–1000 people one at a time is the actual bottleneck, and the previous form
  closed after every save.
- Choosing "Thêm anh/chị/em" previously wrote a `console.warn` and created no relationship
  at all — a silent no-op. Siblings are now linked through the target's parents, which is
  what the graph layout and the kinship resolver already read. When no parent is known the
  form says so and refuses, instead of appearing to succeed.
- The form previously wrote a person and then its relationships as separate statements, so
  a failure between them left an orphan. One `bulkImport` call cannot half-apply.

**Impact**

- A spouse now produces one `SPOUSE` row rather than two. Both the layout and the kinship
  graph already treat the edge as undirected, so the second row only ever duplicated work;
  trees created before this change still render correctly.
- 94 tests across 15 files; lint, typecheck, and production build pass.

**References**

- `src/components/QuickAddForm.tsx`, `src/db/bulk.ts` (`linksForRelation`), `tasks.md` `ENT-002`

## 2026-08-16 - Paste a family list straight out of a spreadsheet

**What**

- `ENT-001`: `src/io/paste/` — `parseTable` (tab-separated paste or quoted CSV), `mapColumns`
  (diacritic-insensitive Vietnamese and English headers, with a documented default order
  when no header is present), and `planPaste`, which produces a per-row plan carrying the
  person, the resolved parent/spouse links, and the issues found.
- `src/components/PasteImport.tsx` — a full-view paste box with a live preview table, per-row
  errors and warnings, and a commit button that names exactly how many rows it will skip.
- `src/lib/personName.ts` — `normalizeName`, `displayName`, and `splitFullName` lifted out of
  `SearchBox.tsx` so the importer can share them without a UI import.
- `Gender` now includes `UNKNOWN`, which the schema CHECK constraint always allowed and the
  kinship engine always expected. GEDCOM `SEX U` maps to it instead of being flattened to
  `OTHER` with a loss entry.

**Why**

- The founder is entering 200–1000 people by hand and from spreadsheets, so this is the
  path onto which every later feature depends.
- Parents and partners are named rather than keyed, because that is what a human types.
  A name matching two people is therefore an error the user resolves with a bracketed birth
  year, never a guess — the same doctrine ADR-013 applies to seniority.
- Rows with errors are excluded from the commit rather than silently repaired, and the
  button says how many are being skipped, so a partial import is always a stated choice.

**Impact**

- 88 tests across 15 files; lint, typecheck, and production build all pass.
- `Gender` gaining a member changes no existing call site; the gender pickers simply do not
  offer `UNKNOWN` as a choice.
- One GEDCOM loss-entry message changed wording, and `SEX U` no longer produces a loss entry
  at all, because the mapping is no longer lossy.

**References**

- `src/io/paste/{table.ts,columns.ts,plan.ts,plan.test.ts}`, `src/components/PasteImport.tsx`
- `src/lib/personName.ts`, `src/store/treeStore.ts` (`addImported`), `tasks.md` `ENT-001`

## 2026-08-16 - Transactional bulk writes, and a backlog reordered around two deadlines

**What**

- `DB-001`: a `batch` worker command wrapping many statements in `BEGIN IMMEDIATE` /
  `COMMIT` / `ROLLBACK`, exposed as `DatabaseClient.batch`, plus `src/db/bulk.ts` —
  `bulkImport` mints ids, resolves caller-supplied `externalId` references (falling through
  to an existing person id when the batch does not define one), validates every relationship
  against stored *and* accumulated rows, and rejects the whole batch with the offending row
  index. `createPerson` and `createRelationship` now share the statement builders.
- Backlog reordered: `XH-005` / `XH-006` to P0, new `XH-007` (engine ↔ branch join) and
  `XH-008` (branch setup UI), new `ENT-001` / `ENT-002` for fast entry, `IO-001` / `IO-002`
  down to P2.
- ADR-018 corrects the record on the graph stack; ADR-019 records the bulk write design.

**Why**

- The founder confirmed two dated outcomes — a wedding invitation list and addressing
  relatives correctly at Tết — and a tree of 200–1000 people entered by hand or pasted from
  a spreadsheet. GEDCOM and Native JSON serve neither, so they yield priority; a
  one-row-at-a-time write path does not survive a 1000-row paste, so it comes first.
- ADR-005 described React Flow plus ELK, which `UI-002` never used and `package.json` never
  depended on. Documentation that misdescribes the stack misdirects every agent reading it.

**Impact**

- `DatabaseClient` gains a required `batch` method; the fake client in `branches.test.ts`
  was updated. No existing call site changes behaviour.
- `CLAUDE.md`, `context.md`, and `plan.md` no longer name React Flow or ELK.

**References**

- `src/db/{bulk.ts,bulk.test.ts,client.ts,protocol.ts,sqlite.worker.ts,persons.ts}`
- ADR-018, ADR-019; `tasks.md` `DB-001`, `ENT-001`, `ENT-002`, `XH-007`, `XH-008`

## 2026-08-16 - Kinship engine, branch profiles, and GEDCOM import landed

**What**

- `XH-001` … `XH-003`: `src/kinship/` — path resolution over parent/child/partner edges with
  derived sibling hops, seniority resolution, and `BAC` / `TRUNG` / `NAM` dictionaries with a
  Quảng Trị provincial override.
- `XH-004`: `src/db/` — schema migration v4 adding `branch_profiles`, `branch_roots`, and
  `person_branch_links`, plus a repository and derived-membership recomputation.
- `IO-002` (import half): `src/io/gedcom/` — tokenizer, encoding detection, `INDI`/`FAM`
  mapping, partial-date parsing, extension preservation, and a structured loss report.
- ADR-016 and ADR-017 covering gender-dependent self-reference.

**Why**

- The relative list needed for a wedding invitation is the immediate driver, and it cannot
  exist without a resolver that produces a correct gọi/xưng pair per relative.
- GEDCOM import re-entered MVP scope under ADR-015 and was built alongside rather than after,
  because the domain mapping informs both.

**Impact**

- `npm run lint`, `npm run typecheck`, and `npm test` all pass; 69 tests across 13 files.
- `LATEST_SCHEMA_VERSION` is now 4. The migration is additive and forward-only.
- `resolveAddress` takes three arguments — profile, path, and ego gender. ADR-016 explains
  why; a two-argument form cannot express `em` versus `anh`/`chị` self-reference.
- Two subagents were interrupted mid-task by a session restart, leaving a broken typecheck
  (dictionary tests not updated for the new third argument) and one wrong assertion in
  `tokenizer.test.ts`, where a level-1 GEDCOM line was asserted to parse as level 0. Both
  were repaired before this entry; the tokenizer itself was correct.
- Nothing is wired to the UI. `src/kinship/` is pure and takes plain arrays, and
  `src/io/gedcom/` returns data without writing to the database.

**References**

- `.docs/v0.2/context.md` ("Implemented Surface")
- `.docs/v0.2/plan.md` ("Current plan — xưng hô delivery")
- `.docs/v0.2/tasks.md` (XH-001…XH-004 DONE, IO-002 IN_PROGRESS)
- `.docs/v0.2/decisions.md` (ADR-016, ADR-017)
- `src/kinship/`, `src/db/branches.ts`, `src/db/schema.ts`, `src/io/gedcom/`

## 2026-08-16 - GEDCOM returned to MVP scope

**What**

- Restored `IO-002` GEDCOM adapters to P0 and restored GEDCOM to the Core MVP success
  criteria and boundary in `brief.md`.
- Added ADR-015 and marked ADR-014 superseded by it.

**Why**

- Public release entered scope after ADR-014 was written. That single fact reverses the
  reasoning: the earlier decision rested on the founder being the only user and having no
  interchange need.
- Strangers arrive holding trees already exported from Ancestry, MyHeritage, and
  FamilySearch. Without GEDCOM import they cannot get their data in at all, and an empty
  tree is where most people abandon a genealogy app.
- Real third-party exports are also the fastest source of the malformed input needed to
  debug an importer, which no hand-authored fixture reproduces honestly.

**Impact**

- The domain model is now designed against GEDCOM's `INDI`/`FAM` structure from the start
  rather than retrofitted to it. ADR-004 already models unions rather than symmetric spouse
  edges, so the two are aligned.
- ADR-014 stands in the record as superseded, not deleted.

**References**

- `.docs/v0.2/tasks.md` (IO-002)
- `.docs/v0.2/brief.md` (Core MVP success criteria, Core MVP boundary)
- `.docs/v0.2/decisions.md` (ADR-014 superseded, ADR-015 accepted)

## 2026-08-16 - GEDCOM deferred to Future

**What**

- Moved `IO-002` GEDCOM adapters from P0 to P2 in `tasks.md`.
- Removed GEDCOM from the Core MVP success criteria and boundary in `brief.md`; it remains
  in the Future roadmap list where it already appeared.
- Added ADR-014.

**Why**

- The founder is entering relatives by hand and has no third-party interchange need yet.
- `tasks.md`, `brief.md`, and the 2026-07-12 changelog entry disagreed on whether GEDCOM was
  MVP or Future, which left the release boundary undefined for anyone reading the docs.
- GEDCOM done properly spans 5.5, 5.5.1, and 7.x with extension preservation and loss
  reporting — real work that buys nothing until another system is involved.

**Impact**

- Data portability is unaffected: `IO-001` Native JSON v1 stays P0 and is what prevents
  lock-in. Deferring GEDCOM does not trap anyone's data.
- MVP boundary is now stated identically in all three places.

**References**

- `.docs/v0.2/tasks.md` (IO-002)
- `.docs/v0.2/brief.md` (Core MVP success criteria, Core MVP boundary)
- `.docs/v0.2/decisions.md` (ADR-014)

## 2026-08-16 - Xưng hô specification

**What**

- Added the xưng hô specification to `context.md`, specifying kinship address-term resolution: a four-stage pipeline
  of path signature, seniority, branch membership, and dialect rendering.
- Added ADR-011 (path signature plus per-branch dictionary), ADR-012 (branch definition
  with manual assignment as a supported peer of derived membership), and ADR-013 (never
  infer seniority).
- Added backlog items `XH-001` through `XH-006` at P1.
- Restructured documentation into versioned snapshots under `.docs/vN.N/`, retiring `.plan/`.
- Added `reference/reports/` holding two scouting reports covering the current codebase and the
  existing documentation set.

**Why**

- "Danh xưng" has been a confirmed post-MVP roadmap item since `overview.md:39` and root
  `README.md:28` but had no specification, no algorithm, and no dialect concept.
- The founder's own tree spans three registers — a Quảng Trị paternal line, a Hà Nội
  maternal line, and a southern spouse's family — which the single-register approach seen
  in `analysis-giapha-os.md:15` cannot express.
- A wedding invitation list is the immediate driver, so correctness of `bác` versus `chú`
  matters before breadth of coverage.

**Impact**

- No code changed. Documentation and backlog only.
- Scouting confirmed the feature is not blocked: the live v1 model carries gender, parent
  and partner edges, birth dates, and `is_anchor`. Schema v2's `family_unions`,
  `family_partners`, and `family_children.birth_order` remain unused by the UI and absent
  from `src/db/types.ts`, so `birth_order` is a later refinement rather than a
  prerequisite.
- No ego-to-target traversal exists today. `validation.ts` `hasDirectedPath` is a
  parent-only cycle check and `graph/layout.ts` `assignGenerations` records no path, so
  `XH-001` builds new traversal rather than extending either.
- `tasks.md` still lists `IO-002` GEDCOM at P0 while the 2026-07-12 entry records GEDCOM as
  confirmed Future. Left unresolved pending founder confirmation.

**References**

- `.docs/v0.2/context.md` (xưng hô specification)
- `.docs/v0.2/decisions.md` (ADR-011, ADR-012, ADR-013)
- `.docs/v0.2/tasks.md` (XH-001 … XH-006)
- `.docs/v0.2/flow.md` (resolution and branch-profile diagrams)
- `.docs/reference/reports/scout-code-260816-1627-codebase-inventory.md`
- `.docs/reference/reports/scout-docs-260816-1621-existing-docs-inventory.md`
- `src/db/types.ts:31`, `src/db/schema.ts:127`, `src/db/families.ts`, `src/graph/layout.ts`

## 2026-07-11 - AI knowledge base reset

**What**

- Reframed `gia-pha` as a legacy prototype and documented the greenfield `coi-nguon` target.
- Added product overview, target architecture/domain, interoperability contracts, privacy rules, decision records, code review, VPS audit template, roadmap, and executable tasks.

**Why**

- Previous `.plan` files mixed implemented behavior with future ideas, contained missing tracking files, and could mislead future AI sessions.
- Product discovery changed the direction from a single experimental tree to a public, open-source, local-only workspace with extensible imports/exports.

**Impact**

- No application code or runtime behavior changed.
- Future work must use `.plan/README.md` as the source-of-truth entrypoint.

**References**

- `decisions/README.md`
- `reviews/2026-07-11-legacy-review.md`

## 2026-07-11 - In-place implementation scope and VPS audit

**What**

- Superseded the greenfield repository decision with ADR-010: **Gia Phả** continues in the existing `gia-pha` repository without a repository rename.
- Aligned the README, overview, roadmap, task backlog, and VPS audit record with the in-place implementation scope.
- Completed and recorded the read-only VPS `j2` audit; its findings block deployment selection until an administrator-controlled header configuration is verified in a separate implementation task.

**Why**

- The approved delivery scope changed from creating `coi-nguon` to replacing the incompatible prototype modules within `gia-pha`.
- The audited deployment account cannot currently prove or configure the HTTPS, isolation-header, and related web-server contract required by the target SQLite Worker/OPFS runtime.

**Impact**

- FND-001 is in progress in `gia-pha`; FND-002 remains its next implementation dependency.
- REP-001 is superseded rather than completed, preserving the historical decision without creating a greenfield repository.
- No application runtime, VPS configuration, or deployment changed.

**References**

- `decisions/README.md` (ADR-001 and ADR-010)
- `operations/vps-audit.md`
- `task.md`

## 2026-07-11 - FND-001 quality baseline

**What**

- Added lint, typecheck, Vitest unit-test, production-build, and Playwright E2E commands plus a GitHub Actions workflow that runs them.
- Added one schema unit-test file and one Vietnamese onboarding browser smoke test.
- Removed the runtime Google font dependency; CI disables Next.js telemetry.

**Why**

- The active `gia-pha` repository needs repeatable validation before replacing its legacy runtime in place.
- Bundled/local styling and disabled CI telemetry support the local-only product direction.

**Impact**

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e` pass locally.
- The current tests are a baseline, not evidence that the legacy persistence or graph behavior is production-ready.

**References**

- `task.md` (FND-001)
- `.github/workflows/ci.yml`
- `vitest.config.ts`
- `playwright.config.ts`

## 2026-07-11 - FND-002 SQLite Worker and OPFS runtime

**What**

- Replaced the runtime `sql.js`/IndexedDB client with the official SQLite WASM package in a dedicated Worker backed only by `OpfsDb`.
- Migrated the application build from Next/Turbopack to Vite so SQLite's Worker, OPFS proxy, and WASM assets compile and run correctly.
- Added explicit browser capability checks and a persistence-on-reload Playwright test.

**Why**

- The target storage contract requires transactions and durable local files; the former transient fallback could not meet it.
- Turbopack could not compile SQLite's dynamic Worker URL, while Vite provides the required worker/WASM asset handling.

**Impact**

- A supported browser persists SQLite data in OPFS across reloads. Missing HTTPS, isolation headers, SharedArrayBuffer, Worker, or OPFS produces an actionable error rather than temporary storage.
- The build now emits a static Vite artifact. Deployment remains blocked by the VPS header constraints recorded in OPS-001.

**References**

- `task.md` (FND-002)
- `src/db/client.ts`
- `src/db/sqlite.worker.ts`
- `vite.config.ts`
- `e2e/home.spec.ts`

## 2026-07-11 - FND-003 multi-tree catalog

**What**

- Added a SQLite catalog database for tree metadata and active-tree state, with each tree stored in an independent OPFS SQLite file.
- Added create, rename, open, and explicitly confirmed delete operations to the Worker/client API and the workspace catalog UI.
- Preserved a pre-existing single-tree OPFS database by cataloguing it as a legacy tree instead of discarding or moving it.

**Why**

- A catalog and file-per-tree topology keeps family trees isolated and makes future export, backup, and recovery safer.
- Deleting a complete family tree is destructive and must be a deliberate user action.

**Impact**

- Users can manage local family trees and switch among isolated datasets. The browser test verifies persistence, isolation, rename, and confirmed deletion.
- The current person/relationship schema remains legacy until DOM-001 and DOM-002 replace it.

**References**

- `task.md` (FND-003)
- `src/db/catalog.ts`
- `src/db/sqlite.worker.ts`
- `src/components/TreeCatalog.tsx`
- `e2e/home.spec.ts`

## 2026-07-11 - DOM-001 domain schema and migrations

**What**

- Added versioned SQLite migrations for tree metadata, partial dates, places, family unions, partners, children, events, import batches, external references, and extension payloads.
- Added foreign-key, uniqueness, check, and trigger constraints for core memberships; migrations run with `BEGIN IMMEDIATE`, rollback on failure, and record `PRAGMA user_version` only after success.
- Applied migrations every time a tree database is created or opened, while retaining existing prototype `persons` and `relationships` tables without destructive reset.

**Why**

- The legacy schema could not model multiple unions, parentage variants, partial dates, or provenance safely.
- A versioned migration boundary is required before domain validation and repositories can rely on durable constraints.

**Impact**

- Isolated tree files now converge to schema version 2 without dropping existing data.
- DOM-002 remains responsible for actionable application-level validation such as ancestor-cycle detection.

**References**

- `task.md` (DOM-001)
- `src/db/schema.ts`
- `src/db/schema.test.ts`
- `src/db/sqlite.worker.ts`

## 2026-07-11 - DOM-002 genealogy validation

**What**

- Added actionable validation for self-links, missing people/unions, duplicate memberships, contradictory partner/child membership, and ancestor cycles in parent relationships.
- Applied relationship validation before the existing relationship write and added family union partner/child repository operations that validate before insertion.

**Why**

- Database constraints alone cannot explain invalid genealogy input or detect transitive parent cycles before a failed commit.
- Clear validation errors let forms retain input and describe the corrective action to users.

**Impact**

- Invalid relationship operations throw typed `GenealogyValidationError` messages instead of persisting corrupt graph edges.
- DOM validation unit coverage now includes self-link, dangling-reference, duplicate-membership, contradictory-membership, and cycle cases.

**References**

- `task.md` (DOM-002)
- `src/db/validation.ts`
- `src/db/families.ts`
- `src/db/validation.test.ts`
- `src/db/persons.ts`

## 2026-07-12 - Review fixes for the runtime migration

**What**

- Fixed review findings on the Vite/OPFS migration diff: NOT NULL `is_anchor` insert failure in quick-add, per-connection `PRAGMA foreign_keys` never set on already-migrated trees, ancestor cycles undetected through `ADOPTED_PARENT_OF`, non-active tree deletion wiping the open tree's state, missing rollback when an OPFS delete fails, and worker crashes leaving all future DB calls hanging.
- Converted `persons.ts` to parameterized queries, extracted the shared worker message protocol into `src/db/protocol.ts`, removed the no-op flush round-trip and debug logging, merged duplicated validation and OPFS helpers, added relationship indexes as schema migration 3, and removed the unused `next-themes` dependency plus dead `test-exec.js`.

**Why**

- The migration diff introduced correctness bugs that broke core flows (adding a member) and silently disabled referential integrity.

**Impact**

- Quick-add works; FK constraints are enforced on every connection; tree deletion and worker failures fail safe. Pre-rewrite IndexedDB prototype data has no migration path (accepted: the old runtime was never released).

**References**

- `src/db/persons.ts`, `src/db/schema.ts`, `src/db/validation.ts`, `src/db/protocol.ts`, `src/db/client.ts`, `src/db/sqlite.worker.ts`

## 2026-07-12 - UI-001 workspace and editor shell

**What**

- Added diacritic-insensitive member search as an accessible combobox (arrow/Enter/Escape keyboard navigation, ARIA listbox) in the workspace header.
- Added a "Đặt làm trung tâm" reference-person action to the side panel; Escape now closes the panel/form, and icon-only controls gained accessible labels.
- Removed the dead Google sign-in button (no login exists in the core product).

**Why**

- The workspace shell must offer search and reference-person selection that are keyboard accessible per the UX workflow targets.

**Impact**

- Members are findable by unaccented queries at any tree size shown, and the reference person can be changed from any selected profile. Unit tests cover search normalization; the browser test covers search, keyboard selection, anchor change, and Escape.

**References**

- `task.md` (UI-001)
- `src/components/SearchBox.tsx`
- `src/components/SidePanel.tsx`
- `src/app/page.tsx`
- `e2e/home.spec.ts`

## 2026-07-12 - Roadmap realignment with the original vision

**What**

- Restored the founder's original feature list (Drive sync, PWA, danh xưng, lunar calendar/Can Chi/ngày giỗ + Google Calendar, child-name suggestions, tử vi/lịch kỵ, CCCD OCR, image export, Google Photos, Google Maps) to the README and overview as the confirmed post-MVP roadmap.
- Confirmed with the founder: core MVP stays local-only (Drive sync in Future), GEDCOM stays in Future, the family-social-network V3 idea is dropped from the official roadmap for now.

**Why**

- A previous documentation rewrite replaced the original README vision without recording which ideas were deferred versus dropped; each idea has now been explicitly confirmed.

**Impact**

- No runtime change. MVP scope is unchanged: workspace/graph/JSON/privacy tasks continue.

**References**

- `README.md`
- `overview.md`

## 2026-07-12 - UI-002 family graph rendering

**What**

- Added a layered family-graph layout (generations by BFS from the focus person, partners adjacent, children hanging from the parents' midpoint) computed in a dedicated layout Web Worker.
- Added pan (pointer drag/arrow keys), cursor-anchored wheel zoom, zoom/fit buttons, a generation-depth selector, focus-on-selected control, and a visible notice when the 500-node guard or depth filter hides people.
- SVG edges distinguish couples (solid), divorce (dashed), and adoptive parentage (dashed drop lines). The canvas keeps its empty state and now renders the real relationship graph instead of a flat row.

**Why**

- The prototype canvas ignored relationship data; the target UX requires a focused, navigable graph that stays responsive at large tree sizes.

**Impact**

- The graph reflects unions and parent-child structure with keyboard-accessible controls. Layout unit tests cover generations, couple/adoption edges, depth filtering, the 500-node guard, and stale-focus fallback; a browser test covers adding a parent from a card and using the controls.

**References**

- `task.md` (UI-002)
- `src/graph/layout.ts`
- `src/graph/layout.worker.ts`
- `src/graph/useGraphLayout.ts`
- `src/components/GraphView.tsx`
- `e2e/home.spec.ts`

## Legacy prototype history

Earlier implementation notes remain available through Git history and the existing analysis files. Their feature-completion claims are not authoritative; verify against code and the legacy review.
