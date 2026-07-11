# Project Changelog

This log records both implementation and durable documentation changes. Dates use `YYYY-MM-DD`.

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

## Legacy prototype history

Earlier implementation notes remain available through Git history and the existing analysis files. Their feature-completion claims are not authoritative; verify against code and the legacy review.
