# Architecture & State Management Review — gia-pha

Date: 2026-08-21 · Branch `main` (dirty) · Scope: `src/app/layout.tsx`, `src/app/page.tsx`, `src/store/treeStore.ts`, `src/db/client.ts`, `src/lib/utils.ts`, build config, `public/`
Verification run: `pnpm install --frozen-lockfile` OK · `pnpm build` PASS · `pnpm lint` FAIL (12 errors)

## Verdict

- The sql.js lifecycle is the weakest layer and it is **data-loss capable today**: `getDb()` has no init-promise guard (double-init on the very first mount), any IndexedDB read error is silently treated as "no database" and then overwritten with an empty DB, and a stale-schema check wipes user data with no backup. There is no Drive sync yet (`src/lib/drive.ts:7-18` is console.log stubs), so a wipe is permanent.
- **Two sources of truth**: SQLite owns `is_anchor`, zustand also persists `anchorPersonId` to localStorage and they are never reconciled (`src/components/FamilyTreeCanvas.tsx:146-153` never calls `setAnchorPersonId`). Store is a hand-patched mirror of the DB, so every writer must remember to sync both — one already forgets.
- App Router usage is essentially "one big client page". Static export prerenders the **onboarding screen** into `out/index.html` (verified: the file contains "Bắt đầu Cây Gia Phả"), so returning users get an onboarding flash + hydration replacement on every launch, then an empty-canvas flash while the DB loads.
- Config health: `pnpm build` is green but `pnpm lint` fails (12 errors), lint/tsc also scan a nested agent worktree under `.claude/`, `package-lock.json` is still tracked while `pnpm-lock.yaml` is untracked, and there is no test tooling at all.
- Despite README/plan claims, this is **not a PWA**: `public/` has no manifest, no service worker, no icons; `src/app/layout.tsx:7-11` declares no `manifest`. Nothing about the app shell works offline, which contradicts the locked local-first vision (data is local, the app is not).

## Findings

### Critical

**C1 — Transient IndexedDB read failure silently destroys the whole family tree**
`src/db/client.ts:80-82` swallows every failure from `loadFromIndexedDB` and returns `null`, which is indistinguishable from "no saved DB yet". `src/db/client.ts:40-42` then creates a fresh empty DB and immediately `persistDb`s it to the **same key** (`DATA_KEY = "main"`, `src/db/client.ts:56`).
Failure scenario: any `openIDB`/transaction failure (Safari ITP eviction of an in-flight handle, a `versionchange` block from another tab, quota/tx abort, corrupt entry) → user opens the app and their entire tree is replaced by an empty database. No backup, no Drive copy (`src/lib/drive.ts:11-13` is a mock), no undo.
Fix: distinguish "key absent" (`req.result === undefined`) from "access failed"; on failure, propagate an error state to the UI and **never write to the `main` key**. Before any overwrite of a non-empty stored blob, copy the old bytes to a `backup-<timestamp>` key.

**C2 — `getDb()` init race creates two DB instances; writes to the loser are lost**
`src/db/client.ts:10-13` returns early only on `dbInstance`, which is assigned after three `await`s (:13, :18, :21). `src/components/FamilyTreeCanvas.tsx:136` calls `Promise.all([getAllPersons(), getAllRelationships()])`, and both go through `getDb()` → guaranteed concurrent init on first mount; `reactStrictMode: true` (`next.config.ts:4`) double-invokes the effect in dev, adding two more.
Failure scenario: two `SQL.Database` instances exist; `dbInstance` ends up as the last assignment. A caller holding the orphaned instance runs `db.run(INSERT ...)` into it, then `saveDb()` exports the *module-level* instance (`src/db/client.ts:47-50`) — the insert is never persisted and disappears on reload. On a fresh DB both branches also run `initDatabaseSchema` + `persistDb` concurrently, racing two full-file writes.
Fix: memoize the promise, not the result:
```ts
let initPromise: Promise<Database> | null = null;
export function getDb() {
  return (initPromise ??= initDb().catch((e) => { initPromise = null; throw e; }));
}
```

**C3 — Stale-schema path wipes user data, and the validity check is too weak to catch real drift**
`src/db/client.ts:31-36` wipes IndexedDB whenever `isSchemaValid` is false. `src/db/schema.ts:61` only checks 5 of 25 `persons` columns and never checks the `relationships` table.
Two failure modes: (a) a real migration (any new required column) silently deletes the user's tree on the first launch after deploy; (b) a v0.1-era DB missing e.g. `zalo_link`/`title_prefix` **passes** the 5-column check, then every `createPerson` fails with `no such column` (`src/db/persons.ts:48-66` names all 23 columns) — a permanent, cryptic broken state instead of a wipe.
Fix: `PRAGMA user_version` + an ordered list of additive `ALTER TABLE` migrations inside a transaction; export the pre-migration bytes to a backup key first; drop the wipe path entirely (or gate it behind explicit user confirmation with a download-first prompt).

### High

**H1 — Multi-tab last-writer-wins whole-file overwrite**
Each tab holds its own snapshot (`src/db/client.ts:8`) and `persistDb` writes the entire exported file to one key (`src/db/client.ts:85-93`). Two tabs open (normal for an installed PWA) → tab A adds a person, tab B (loaded earlier) adds a different one; whichever saves last silently erases the other's work.
Fix: single-writer discipline — `navigator.locks.request()` around export+put, plus a monotonic revision stored alongside the blob; refuse/reload when the stored revision is newer than the in-memory one. `BroadcastChannel` to notify other tabs to re-read.

**H2 — Anchor state diverges permanently between SQLite and the persisted store**
`src/components/FamilyTreeCanvas.tsx:170` derives the anchor from DB (`persons.find(p => p.is_anchor)`), but `src/components/QuickAddForm.tsx:48` derives surname suggestions from the persisted `anchorPersonId`. `handleSetAnchor` (`src/components/FamilyTreeCanvas.tsx:146-153`) updates the DB and the `persons` array but **never** calls `setAnchorPersonId`; the only writer is `src/components/OnboardingScreen.tsx:52`.
Failure scenario: user changes the center person via the ⭐; from then on the "suggest surname" feature is bound to the original onboarding person forever, across reloads (it is persisted, `src/store/treeStore.ts:101`).
Fix: delete `anchorPersonId` from the store and derive the anchor from `persons` (single source of truth). Keep only `isOnboarding`/`locale`/`frequentlyUsedFields` in persisted UI state.

**H3 — DB data is loaded only inside a component that is gated on localStorage state**
`src/app/page.tsx:16` gates on `isOnboarding && persons.length === 0`; `isOnboarding` is persisted to localStorage (`src/store/treeStore.ts:99-103`) while `persons` live in IndexedDB and are loaded only by `FamilyTreeCanvas` (`src/components/FamilyTreeCanvas.tsx:134-144`), which mounts only when the gate is false (`src/app/page.tsx:95-101`).
Failure scenarios: (a) localStorage cleared/evicted but IndexedDB intact → the existing tree is invisible, the user is forced through onboarding, creating a duplicate "self", and `setAnchorPerson` (`src/db/persons.ts:87-88`) silently demotes the real anchor; (b) after a C3 wipe with `isOnboarding: false` persisted → canvas mounts with 0 persons and onboarding is unreachable.
Fix: bootstrap the DB read above the conditional (a `useEffect` in `page.tsx` or a `bootstrap()` store action), and derive onboarding from data (`persons.length === 0 && !hasAnchor`) instead of a persisted boolean.

**H4 — Dead-end blank canvas when no row has `is_anchor = 1`**
`src/components/FamilyTreeCanvas.tsx:175` returns an empty coords map when no anchor exists; the renderer skips any person without coords (`src/components/FamilyTreeCanvas.tsx:424-425`). Result: the stats badge says "N thành viên" (`:396`) while the canvas shows **zero cards** and no recovery affordance. Reachable via H3(b), via a DB imported without an anchor (v0.7 import), or if a delete path ever removes the anchor.
Fix: fall back to the first person as implicit anchor when none is flagged, or render an explicit "choose a center person" state.

**H5 — Destructive `seedDemoData` global shipped in the production bundle**
`src/app/page.tsx:19-21` assigns `window.__giapha = { seed: seedDemoData }` unconditionally; `seedDemoData` starts with `DELETE FROM relationships` / `DELETE FROM persons` (`src/db/persons.ts:162-163`) with no confirmation and no backup. Verified present in the export: `out/_next/static/chunks/a05b0d5692f7b0b4.js` contains `__giapha`.
Fix: guard with `if (process.env.NODE_ENV !== "production")` so it is tree-shaken out; require a confirm + backup even in dev. Also note the seed leaves the store stale (no reload after seeding).

**H6 — `pnpm lint` fails: no green gate**
12 errors, all `@typescript-eslint/no-explicit-any` / `no-require-imports`: `src/app/page.tsx:20`, `src/db/persons.ts:28,76,90,145,209`, `test-exec.js:1`. `next build` does not run ESLint in Next 16, so CI on `build` alone would look green while lint is broken.
Fix: type the dev global via `declare global`, replace `catch (err: any)` with `catch (err)` + `err instanceof Error`, type sql.js results with `QueryExecResult`, delete `test-exec.js`.

**H7 — No PWA surface at all, contradicting the locked vision**
`public/` contains only stray Next.js template SVGs + `sql-wasm.wasm`; no `manifest.webmanifest`, no service worker, no icons. `src/app/layout.tsx:7-11` sets no `manifest`, no `viewport`, no `themeColor`, no apple-touch-icon. README:8 claims "PWA Ready" and `.plan/plan.md:27-29` marks "Khởi tạo dự án Next.js PWA" as ✅ — both false.
Impact: not installable; the app shell (JS + 645 KB `sql-wasm.wasm`) is HTTP-cache-only, so an offline launch after cache eviction fails even though the data is local.
Fix: add a manifest + icons + `metadata.manifest`, and a small service worker precaching the shell and `sql-wasm.wasm` with an explicit update strategy. (Plan defers "PWA installable" to v1.0 — then fix the README/plan claims now.)

**H8 — WASM path is origin-absolute; sub-path static hosting breaks the whole app**
`src/db/client.ts:15` hardcodes `locateFile: () => "/sql-wasm.wasm"` while `next.config.ts:3` is `output: "export"` with no `basePath`/`assetPrefix`. Deployed to a GitHub Pages project path (`/gia-pha/`), sql.js requests `/sql-wasm.wasm` → 404 → `getDb()` rejects → the only error handling is `console.error("Lỗi tải dữ liệu")` (`src/components/FamilyTreeCanvas.tsx:140`), so the user sees a permanently empty tree with no message.
Fix: derive from a single `basePath` constant shared by `next.config.ts` and `locateFile`; surface init failures as a visible error state.

**H9 — No transactions around multi-statement writes; partial writes get persisted**
No `BEGIN`/`COMMIT` anywhere in `src/db/` (grep: zero hits). `setAnchorPerson` runs two `UPDATE`s (`src/db/persons.ts:87-88`); `deletePerson` runs two `DELETE`s (`:115-117`); `seedDemoData` runs ~34 statements (`:200-256`); `QuickAddForm` creates a person then 1-2 relationships as separate persisted operations (`src/components/QuickAddForm.tsx:76-130`) — a failure between them leaves an orphan person with no edges (invisible per H4/coords) already committed to IndexedDB.
Fix: wrap each logical operation in `BEGIN`/`COMMIT` with `ROLLBACK`, persist once at the end; make relationship creation part of the person-creation unit of work.

### Medium

**M1 — Static export prerenders the onboarding screen → guaranteed hydration replacement + double flash**
`out/index.html` (built during this review) contains "Bắt đầu Cây Gia Phả" because module-scope store defaults are `isOnboarding: true, persons: []` (`src/store/treeStore.ts:49-55`). zustand `persist` hydrates **synchronously at store creation** for sync localStorage (`zustand/middleware.js:470` calls `hydrate()`), so the first client render already differs from the served HTML. `suppressHydrationWarning` on `<html>` (`src/app/layout.tsx:19`) does not cover descendant mismatches — it only masks the warning for that element.
Effect on every launch for a returning user: onboarding form paints → replaced by canvas → canvas paints the "empty tree" state (`src/components/FamilyTreeCanvas.tsx:372`) → cards appear once the async DB read finishes.
Fix: `skipHydration: true` + `rehydrate()` in an effect, and render a neutral shell until both store rehydration and the first DB read complete. Add explicit `status: "loading" | "ready" | "error"` to the store so "loading" and "empty" are distinguishable.

**M2 — Selector-less `useTreeStore()` everywhere: full-store subscriptions**
`src/app/page.tsx:14`, `src/components/FamilyTreeCanvas.tsx:130-131`, `src/components/SidePanel.tsx:11-18`, `src/components/QuickAddForm.tsx:22-32`, `src/components/OnboardingScreen.tsx:17`. In zustand v5 a selector-less subscription re-renders on **every** `set()`.
Effect: one card click (`selectPerson`) re-renders the header, the canvas, both O(P×R) memos' consumers, and all framer-motion cards. `handleSetAnchor` makes this worse by issuing N separate `updatePerson` `set()` calls (`src/components/FamilyTreeCanvas.tsx:148`) → N store notifications → N full re-renders.
Fix: narrow selectors (`useTreeStore(s => s.persons)`) or `useShallow` for groups; collapse the anchor flip into one `setPersons`.

**M3 — Layout/edge computation is O(persons × relationships) and duplicated three times**
`parentsOf`/`childrenOf`/`spousesOf` are re-declared as array filters inside both memos (`src/components/FamilyTreeCanvas.tsx:177-180`, `:293-295`) and again inside `getRelationLabel` (`:16-84`), each scanning the full `relationships` array per person. At 500 persons / 1500 relationships that is ~10⁶ comparisons per recompute, and M2 makes recomputes frequent.
Fix: build adjacency `Map`s once per data revision in a `lib/` module and pass them to label + layout + edge functions (also removes the risk of labels and connectors disagreeing).

**M4 — Domain logic lives inside the view component**
`src/components/FamilyTreeCanvas.tsx` is 446 lines containing the kinship-terminology rules (`:16-84`) and the whole 5-tier layout algorithm (`:173-287`) — the actual product differentiators, currently untestable and unreachable from any other surface (export-to-image, danh xưng calculation in v0.6 will need them).
Fix: extract `src/lib/kinship.ts` (pure: persons + relationships + anchor → label) and `src/lib/tree-layout.ts` (pure: → coords + edges). No new abstractions needed, just move the pure functions out.

**M5 — Lockfile inconsistency: npm lock tracked, pnpm lock untracked**
`git ls-files` still lists `package-lock.json` (deleted in the working tree) while `pnpm-lock.yaml` is untracked; `package.json:44` declares `packageManager: pnpm@10.33.2`. A fresh clone/CI resolves with the stale npm lock or with no lock at all → non-reproducible installs.
Fix: commit `pnpm-lock.yaml`, `git rm package-lock.json`.

**M6 — Lint and tsc scan a nested agent worktree**
Lint output includes `/Users/hangvalong/Code/projects/gia-pha/.claude/worktrees/flamboyant-moser/src/db/persons.ts` and `.../test-exec.js` — a full second copy of the sources. `eslint.config.mjs:9-19` ignores `references/**`, `.plan/**`, `.agents/**` but not `.claude/**`; `tsconfig.json:25-33` includes `**/*.ts(x)` and excludes only `node_modules`/`references`.
Impact: duplicated errors, doubled type-check work, and a real risk of reading/editing the wrong copy.
Fix: add `.claude/**` to both the ESLint `globalIgnores` and the tsconfig `exclude`.

**M7 — Zero test infrastructure**
No test runner in `package.json:5-10` / `:30-43`, no test files. The kinship rules and layout math (M4) are pure functions with well-defined expected output and are the most defect-prone code in the repo.
Fix: add `vitest` and cover `lib/kinship` + `lib/tree-layout` immediately after the M4 extraction.

**M8 — IndexedDB connections opened per operation and never closed; no quota handling**
`openIDB()` is called fresh in `loadFromIndexedDB`, `persistDb`, and `clearIndexedDB` (`src/db/client.ts:71-107`) and the handle is never `close()`d. Accumulated open connections block any future `versionchange` upgrade (a schema/store change in a later release will hang), and `QuotaExceededError` on `put` surfaces only as a generic thrown error.
Fix: one lazily-created cached connection; close on `pagehide`; catch quota errors explicitly and surface "storage full — export your data".

**M9 — Whole-file re-export on every single mutation**
`saveDb()` → `db.export()` serializes the entire SQLite file per write (`src/db/client.ts:47-50`, called from every mutation in `src/db/persons.ts:80,94,109,118,137,257`). Fine at 14 rows; with avatars in `avatar_url` (schema.ts:29) it becomes an O(total-size) write per keystroke-level action, and it is also the mechanism behind H1.
Fix: coalesce saves (trailing debounce ~300 ms + flush on `pagehide`), keep a dirty flag surfaced in the UI.

### Low

**L1 — Comment contradicts the code.** `src/db/schema.ts:3` claims "Uses DROP + CREATE to guarantee a clean schema"; the implementation is `CREATE TABLE IF NOT EXISTS` (`:9`, `:39`). Polished-but-wrong comment; fix the text and state the real policy.

**L2 — Declared foreign keys are never enforced.** `src/db/schema.ts:45-46` declares FKs but SQLite defaults `foreign_keys` to OFF and no `PRAGMA foreign_keys = ON` exists anywhere in `src/db/`. Orphan relationships are insertable — already reachable because relationship inserts are not transactional (H9).

**L3 — Changelog claims unimplemented features.** `.plan/plan.md:135-137` lists scroll-based panning, zoom, and arrow-key navigation as Added/Changed in 0.5.0, while `src/components/FamilyTreeCanvas.tsx:407` still uses framer-motion `drag` and the file contains no wheel/keydown/scale handling (grep: no `onWheel`, no `keydown`, no zoom state). The task list at `.plan/plan.md:100-102` correctly shows them unchecked — the changelog is the wrong one.

**L4 — Dead code.** `src/lib/drive.ts:7-18` (no importer), `deletePerson` in both `src/store/treeStore.ts:68-76` and `src/db/persons.ts:112-119` (no caller — delete is not wired into any UI), `test-exec.js` (tracked, lint error), template SVGs in `public/` (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`).

**L5 — Phone normalization duplicated.** Identical `+84${phone.replace(/^0/,"").replace(/\D/g,"")}` in `src/components/OnboardingScreen.tsx:38` and `src/components/QuickAddForm.tsx:63`. Move to `src/lib/` next to the existing `PhoneInput`.

**L6 — Silent "sibling" no-op.** `src/components/QuickAddForm.tsx:110-119`: choosing the left (+) button creates the person but only `console.warn`s instead of creating an edge, so the new person has no relationships and is therefore rendered off in the y=5 "leftovers" row (`src/components/FamilyTreeCanvas.tsx:275-281`). Either derive siblings from shared parents at insert time or disable the button until supported.

**L7 — Unvalidated user URL used as `href`.** `src/components/SidePanel.tsx:149` renders `href={value}` from user-entered `fb_link`/`zalo_link`. Self-only today, but v0.7 imports a `.db` from Drive/another relative — at that point an imported record is untrusted input and `javascript:` becomes a live XSS sink. Whitelist `https?:` before render.

**L8 — SQL built by string interpolation.** `src/db/persons.ts:36-41` + all call sites; `updatePerson` interpolates raw object **keys** into the statement (`:102-107`). Typed callers make it safe today, but the v0.7 CSV/GEDCOM importer will feed external data through the same helper. Switch to `db.run(sql, params)` / prepared statements (sql.js supports both) before import lands.

**L9 — Config/metadata nits.** `next.config.ts:1-2` uses a JSDoc type instead of `import type { NextConfig }` (typos silently ignored); `src/app/layout.tsx:19` hardcodes `lang="vi"` while the store supports `en`; `package.json:3` says `0.1.0` while the plan is at v0.5; `components.json:5` sets `"rsc": true` for an app with no server components; `src/store/treeStore.ts:97-105` has no `persist` `version`/`migrate`, so a future `partialize` change merges stale localStorage silently; `public/sql-wasm.wasm` is a manual copy pinned against `sql.js: "^1.14.0"` (`package.json:24`) — checksums match 1.14.0 today, but a minor bump will desync the glue JS from the committed WASM. Copy the WASM in a `prebuild` script instead.

**Verified non-issue (risk calibration).** `next/font/google` (`src/app/layout.tsx:2,5`) self-hosts at build time — `out/index.html` contains no `fonts.googleapis`/`fonts.gstatic` references and the woff2 files are in `out/_next/static/media/`. No runtime third-party request, so the README's privacy claim holds for fonts.

## Codex Cross-Review

Codex (`codex-cli 0.149.0`) reviewed the same files independently and returned 16 items. Reconciliation:

| # | Codex finding | Verdict | Evidence |
|---|---|---|---|
| 1 | `getDb()` init race via `Promise.all` + StrictMode | **AGREE** | Matches C2 independently, same call site (`FamilyTreeCanvas.tsx:136`). |
| 2 | Auto-wipe on invalid/older schema destroys data | **AGREE** | C3. Codex's `PRAGMA user_version` + backup fix matches mine. |
| 3 | Multi-tab last-writer-wins whole-file overwrite | **AGREE** — I had not raised this before the cross-review | `src/db/client.ts:8` per-tab instance + `:85-93` full-file `put` on one key. Folded in as H1 with the Web Locks + revision fix. |
| 4 | All IDB read failures treated as "no DB" | **AGREE** | C1, same lines (`:80-82`, `:96-107`). |
| 5 | No transactions around multi-statement ops | **AGREE** | H9; grep confirms zero `BEGIN`/`COMMIT` in `src/db/`. |
| 6 | In-memory mutation before durable write; quota/termination | **AGREE (partial)** | Correct that the in-memory DB diverges when `persistDb` throws, and quota is unhandled (M8/M9). Nuance Codex missed: every mutation `await`s `saveDb()` before returning (`src/db/persons.ts:80,94,109,118,137`), so a plain tab close does not lose a completed edit — the loss window is a failed/aborted `put`, not normal navigation. |
| 7 | SQLite + zustand both own domain state | **AGREE** | H2/H3; the concrete divergence Codex did not name is `anchorPersonId` (`FamilyTreeCanvas.tsx:146-153` vs `QuickAddForm.tsx:48`). |
| 8 | DB load gated behind onboarding → "stuck on onboarding" | **AGREE with correction** | The gate/load coupling is real (H3), but "never loads / remains stuck" overstates it: completing onboarding sets `isOnboarding: false` (`treeStore.ts:87`) and the canvas then loads the pre-existing tree. The actual damage is a duplicate "self" plus `setAnchorPerson` (`persons.ts:87`) silently demoting the previous anchor. |
| 9 | `window.__giapha.seed()` destructive global in production | **AGREE** | H5. Independently verified in the built artifact: `__giapha` present in `out/_next/static/chunks/a05b0d5692f7b0b4.js`. Severity qualifier: not remotely reachable (console/extension/bookmarklet only), so this is accidental-destruction risk, not a remote vulnerability. |
| 10 | Hardcoded `/sql-wasm.wasm` breaks sub-path hosting | **AGREE** | H8. Codex cited `next.config.ts:2-5`; the exact line is `next.config.ts:3` (`output: "export"`). |
| 11 | Schema validation too narrow; FKs never enabled | **AGREE** | C3 + L2. Confirmed: `schema.ts:61` checks 5 columns, never checks `relationships`; no `PRAGMA foreign_keys` in `src/db/`. The "missing indexes" part is **UNVERIFIED/not applicable** — every query is a full `SELECT *` with no `WHERE` (`persons.ts:25,143`), so indexes buy nothing at family-tree scale; the real cost is the in-memory O(P×R) filtering (M3). |
| 12 | Persisted state hydrates before React hydration; `suppressHydrationWarning` insufficient | **AGREE, upgraded from "can" to confirmed** | `out/index.html` contains "Bắt đầu Cây Gia Phả", and `zustand/middleware.js:470` calls `hydrate()` at store creation (sync localStorage ⇒ applied before first render). M1. |
| 13 | Selector-less subscriptions → canvas-wide re-render blast | **AGREE** | M2; add `SidePanel.tsx:11-18`, `QuickAddForm.tsx:22-32`, `OnboardingScreen.tsx:17` to Codex's two sites, plus the N-`set()` loop at `FamilyTreeCanvas.tsx:148`. |
| 14 | Domain logic + duplicated traversal inside a 446-line component | **AGREE** | M3/M4; `wc -l` = 446 confirmed. |
| 15 | No manifest / service worker / icons despite installability claim | **AGREE** | H7; `ls public` confirms; `layout.tsx:7-11` has no `manifest`. |
| 16 | `schema.ts` comment claims DROP + CREATE | **AGREE** | L1. |

Codex missed (present in my findings): the `anchorPersonId` divergence (H2), the blank-canvas dead end when no anchor exists (H4), the failing `pnpm lint` gate and the `.claude/` worktree being linted/type-checked (H6/M6), the lockfile inconsistency (M5), absent test tooling (M7), the silent sibling no-op (L6), the unvalidated `href` sink (L7), the false 0.5.0 changelog entries (L3), and the manually-copied WASM vs `^1.14.0` drift (L9). No Codex finding was refuted outright; two needed correction (#6, #8) and one sub-claim was not applicable (#11 indexes).

## Refactor Recommendations

Prioritized, minimal, no new abstractions beyond what the defects require.

1. **Make `src/db/client.ts` correct before anything else** (fixes C1, C2, C3, H1, M8, M9 in one pass, ~80 LOC): memoized `initPromise`; a single cached IDB connection; `req.result === undefined` vs error distinction; `PRAGMA user_version` + additive migrations; backup key written before any destructive path; `navigator.locks` + revision check around save; debounced save with a `pagehide` flush.
2. **One write path, one source of truth** (fixes H2, H3, part of H9): move `bootstrap()`, `addPerson()`, `setAnchor()`, `deletePerson()` into the store as async actions that call `src/db/persons.ts` inside a transaction and then refresh from the DB. Components stop patching store state by hand. Delete `anchorPersonId`; derive onboarding from data, not from a persisted boolean.
3. **Add `status`/`error` to the store and a neutral boot shell** (fixes M1's double flash and gives H8/C1 somewhere to display). Pair with `skipHydration: true`.
4. **Extract `src/lib/kinship.ts` + `src/lib/tree-layout.ts` as pure functions with a prebuilt adjacency index** (fixes M3, M4), then add `vitest` and cover them (M7). This is the cheapest defect-prevention in the repo.
5. **Green the gates**: fix the 12 lint errors, ignore `.claude/**` in ESLint + tsconfig, commit `pnpm-lock.yaml` / remove `package-lock.json`, delete `test-exec.js` and the template SVGs (H6, M5, M6, L4).
6. **Guard the dev global and add the PWA surface** (H5, H7): `NODE_ENV` guard for `__giapha`; manifest + icons + `metadata.manifest` + a shell/WASM-precaching service worker. Even if install lands in v1.0, the offline shell is what makes "local-first" true — and update README/plan today so they stop claiming it.
7. **Before v0.7 import/sync**: parameterized statements (L8), `https?:`-only links (L7), `PRAGMA foreign_keys = ON` (L2). An imported `.db` from Drive is untrusted input, and every one of those three becomes a real trust-boundary hole at that moment.

## Unresolved Questions

1. Deployment target — origin root or a sub-path (GitHub Pages project site)? Determines whether H8 is latent or already broken.
2. Is losing the local DB acceptable until v0.7 Drive sync exists? If not, an "export .db to file" escape hatch should precede any migration/wipe work (C3).
3. Multi-tab: is single-writer enforcement (reject the second tab) acceptable UX, or is cross-tab merge expected? Affects the H1 fix shape.
4. Avatars: are `avatar_url` values going to be base64 data URLs (drives M9/M8 quota severity) or Drive/Photos references?
5. Is the `.claude/worktrees/flamboyant-moser` copy an active agent worktree or an abandoned one? If abandoned it should be removed, not just ignored (M6).
6. Was the 0.5.0 changelog entry (`.plan/plan.md:135-137`) written ahead of implementation intentionally, or is panning/zoom code missing that was expected to be committed? (L3)
