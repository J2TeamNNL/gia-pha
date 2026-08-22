# Data Model & DB Layer Review — gia-pha

Scope: `src/db/schema.ts`, `src/db/types.ts`, `src/db/persons.ts`, `src/db/client.ts` (query/tx surface only).
Callers read for contract checking: `src/components/FamilyTreeCanvas.tsx`, `QuickAddForm.tsx`, `OnboardingScreen.tsx`, `PersonCard.tsx`, `src/store/treeStore.ts`, `src/app/page.tsx`.
Empirical verification: scratch SQLite DB built from the exact DDL (results inline below). Typecheck: `tsc --noEmit` clean. Lint: 5 errors in `src/db` (all `no-explicit-any`). Tests: none exist (no test runner in `package.json`).

## Verdict

**NOT production-ready for v0.7 (Drive Sync + GEDCOM).** Acceptable as a v0.5 prototype, but the data layer has three landmines that will cause irreversible user data loss the moment Drive sync ships: (1) no migration path — the "stale schema" branch wipes the file instead of migrating, and its detector produces false negatives that permanently brick the app; (2) an IndexedDB read error is indistinguishable from "no data" and results in an empty DB being persisted over the user's tree; (3) `seedDemoData()` unconditionally `DELETE`s everything and is exposed on `window` in production builds.

Domain-wise the model covers ~40% of the stated requirements. The `relationships` edge table is the right core choice, but marriage has no identity (no union entity, no ordering, no dates/status), so polygamy is *storable* but not *interpretable*; lunar death (`ngày giỗ`) is an opaque `TEXT` blob and cannot drive the promised Calendar reminders; per-person map coordinates, nickname and bilingual names have no columns at all.

Referential integrity is effectively absent: FK enforcement is off, a person can be their own parent, and ancestor cycles insert cleanly.

## Requirement Coverage Matrix

| # | Requirement | Supported | Evidence | Gap |
|---|---|---|---|---|
| 1 | VN/intl naming: họ / tên đệm / tên, nickname, bilingual VI-EN | Partial | `schema.ts:11-13`, `types.ts:4-6`, form split `QuickAddForm.tsx:178-242` | No `nickname` column (README line 9 promises it). No bilingual/`*_en` or native-script variants. `title_prefix` doubles as both honorific and computed vai-vế fallback (`PersonCard.tsx:86-87`) |
| 2 | Polygamy/polyandry, spouse ordering, concurrent vs sequential | Partial | `SPOUSE`/`EX_SPOUSE` `types.ts:33-37`; `is_primary` `schema.ts:44`; multi-edge insert allowed (verified) | No union/marriage entity, no `seq`, no marriage/divorce/widowhood dates, no status. Widowhood indistinguishable from current marriage. `is_primary` never read anywhere in the app (grep: 0 UI usages). Spouse edge direction is inconsistent between writers (F-6) |
| 3 | Child classification: con đẻ / nuôi / con rể / con dâu / con riêng | Partial | `PARENT_OF`, `ADOPTED_PARENT_OF` `types.ts:34-36` | `ADOPTED_PARENT_OF` is declared but never written by any caller (only `PARENT_OF`/`SPOUSE` are, `QuickAddForm.tsx:96-117`). No step/foster parentage. Con rể/con dâu are derivable (SPOUSE of a child), but nothing marks them, and the canvas never resolves them |
| 4 | Deceased: death date + ngày giỗ âm lịch + Can Chi | Partial | `is_living`, `death_year/month/day`, `death_lunar TEXT` `schema.ts:16,20-23` | `death_lunar` is free-form TEXT → cannot compute reminders, cannot detect leap month (tháng nhuận), cannot round-trip. No lunar *birth* fields, no Can Chi column (derivable from year, but no precision flag). No CHECK that a deceased person has death data, so `PersonCard.tsx:31-37` renders a dead ancestor as "Sinh 1938" (seed does exactly this: `persons.ts:176-177`) |
| 5 | Per-person Google Maps location | No | `contact_address TEXT` `schema.ts:26`, `burial_location TEXT` `schema.ts:24` | No lat/lng/place_id for either residence or mộ phần. "Chỉ đường tới nhà" (README line 11) needs geocoding on every render or a stored coordinate |
| 6 | Contact: +84 phone, Facebook, avatar | Yes | `phone_number`, `zalo_link`, `fb_link`, `avatar_url` `schema.ts:25-29`; `+84` normalize `QuickAddForm.tsx:63-65` | Single phone only; no E.164 validation at the DB boundary (`zod` is a dependency but has 0 usages in `src/`) |
| 7 | Generation depth, anchor person, kinship terms | Partial | `is_anchor` `schema.ts:32`; kinship derived in JS `FamilyTreeCanvas.tsx:16-84` | No `generation` column and no lineage root; layout hard-codes 5 tiers and dumps everyone else at `y:5` (`FamilyTreeCanvas.tsx:276-282`). Anchor is a per-row boolean with no uniqueness guarantee (F-7) and is duplicated in zustand (`treeStore.ts:14`) — two sources of truth. Kinship is ambiguous by construction: `"Bác/Chú/Cậu"` (`FamilyTreeCanvas.tsx:78`) because the model lacks birth order + side-of-family |
| 8 | GEDCOM/CSV I/O, name-collision vs ancestors, Photos gallery (V3) | No | — | No `external_ref`/xref column → no idempotent re-import. No FAM/union entity → GEDCOM export must guess families. No `media_albums` table (planned in `.plan/02-database-schema.md:69-78`, not implemented). Name-collision check needs an ancestor walk, which is unsafe today because cycles are insertable (F-3) |

## Findings

### Critical

**F-1 — `isSchemaValid()` false-positives brick the app permanently; false-negatives wipe the user's tree.**
`src/db/schema.ts:56-66`, `src/db/client.ts:23-42`
`isSchemaValid` only checks 5 of 25 columns (`schema.ts:61`), and `CREATE TABLE IF NOT EXISTS` (`schema.ts:9`) never adds columns to an existing table. Verified on a scratch DB holding a v0.1-shaped `persons` table: the validator's 5 required columns all matched (`5/5` → returns `true`), then the `createPerson` INSERT failed with `table persons has no column named middle_name`. The user's DB is kept, every write throws forever, and the only recovery is manually clearing IndexedDB via devtools.
Inverse failure: the day anyone adds a column to the `required` list, the `else` branch (`client.ts:30-36`) calls `clearIndexedDB()` — silent total data loss, no backup, no export prompt. Once Drive sync lands, the wiped file is uploaded and the last good revision ages out.
Also: the file header comment claims "Uses DROP + CREATE" (`schema.ts:3`); no DROP exists. Comment is wrong about the mechanism it is justifying.
Fix: `PRAGMA user_version` + an ordered migration list applied inside a transaction; `ALTER TABLE ADD COLUMN` for additive changes; snapshot the pre-migration bytes to a second IndexedDB key (and a Drive revision) first; never wipe silently — surface an export-then-reset dialog.

**F-2 — An IndexedDB read failure is treated as "new user" and overwrites the tree with an empty DB.**
`src/db/client.ts:71-83` returns `null` on *any* exception (quota, blocked upgrade, private-mode, transient `InvalidStateError`). `getDb()` then falls through to `client.ts:40-42`, creates an empty DB, and immediately `persistDb`s it over the previous value. Whole family tree gone on a transient error.
Fix: distinguish "absent" from "failed". Rethrow read errors and render a retry/recovery UI; only create a fresh DB when the store is confirmed empty.

**F-3 — Referential integrity is not enforced; a person can be their own ancestor.**
`src/db/schema.ts:45-46`, `src/db/persons.ts:121-139`
Verified on the exact DDL: `PRAGMA foreign_keys` = `0` (SQLite/sql.js default, and no code anywhere sets it — grep for `PRAGMA` returns only `table_info`). Inserting `('r1','ghost-1','ghost-2','PARENT_OF',0)` with no such persons succeeded. Inserting `person_id = related_to_id` `PARENT_OF` succeeded (self-parent). A→B→A parent cycle succeeded. `createRelationship` validates nothing (`persons.ts:121-139`).
Impact: the planned name-collision-vs-ancestors walk and any recursive CTE will infinite-loop; GEDCOM export will emit a malformed file; the canvas hides the corruption because its traversal is depth-bounded.
Fix: `PRAGMA foreign_keys = ON` at open, `ON DELETE CASCADE` on both FKs, `CHECK (person_id <> related_to_id)`, and an ancestor pre-check inside the insert transaction. Additionally when FK is enabled, deleting a person requires the cascade (verified: with `foreign_keys=ON` and orphan rows present, `DELETE FROM persons` fails with `FOREIGN KEY constraint failed`) — so enabling the pragma on an existing dirty DB must be preceded by an orphan sweep.

**F-4 — `seedDemoData()` destroys real user data and is reachable from any script in production.**
`src/db/persons.ts:160-163` runs `DELETE FROM relationships; DELETE FROM persons` with no guard, no confirmation, no "DB is empty" precondition, no transaction, then `saveDb()` (`persons.ts:257`). `src/app/page.tsx:19-21` attaches it to `window.__giapha.seed` on every mount in every build (no `NODE_ENV` guard). Any XSS, bookmarklet, browser extension, or curious user in devtools erases a multi-generation family tree; the Drive sync then propagates the erasure.
There is also no way to tell demo rows from real ones — no `is_demo` flag — so a user who seeded once cannot clean up selectively.
Fix: gate on `process.env.NODE_ENV !== "production"`, require an explicit confirmation token argument, wrap in a transaction, and add `is_demo INTEGER DEFAULT 0` so demo rows are identifiable and removable.

### High

**F-5 — Duplicate `getDb()` initialization race: two DB instances, silently lost writes.**
`src/db/client.ts:10-45`. `dbInstance` is assigned only after 3+ `await`s, and there is no in-flight promise memo. `FamilyTreeCanvas.tsx:136` deliberately calls `Promise.all([getAllPersons(), getAllRelationships()])`, so on first load both calls see `dbInstance === null` and each constructs its own `SQL.Database`. Two `persistDb` writes race; the loser's `dbInstance` assignment can be overwritten, and any write already applied to the orphaned instance is lost on the next `saveDb()` (which exports whatever `dbInstance` currently points at).
Fix: memoize the in-flight promise (`let initPromise; if (!initPromise) initPromise = init(); return initPromise;`) and serialize `persistDb` through a single-slot write queue.
(Overlaps `rev-arch`'s WASM-lifecycle scope; reported here because the consequence is data loss.)

**F-6 — Spouse edges are written in two incompatible shapes; duplicates corrupt layout.**
`src/components/QuickAddForm.tsx:107-118` writes SPOUSE **twice** (both directions); `src/db/persons.ts:224,240-241` writes it **once**. Readers treat SPOUSE as undirected (`FamilyTreeCanvas.tsx:181,294`), so a quick-added spouse comes back twice from `spousesOf()`. `FamilyTreeCanvas.tsx:186` then does `spouses.forEach((sp, i) => map.set(sp, { x: i + 1, y: 2 }))` — the same spouse is written at `x:1` then overwritten at `x:2`, leaving a visible hole next to the anchor and a mis-centered child stem (`marriageMidX`, line 252). The relationship counter (`FamilyTreeCanvas.tsx:400`) also double-counts.
Verified: no uniqueness constraint exists — 3 identical/mirrored SPOUSE rows inserted cleanly.
Fix: pick canonical single-row storage (e.g. lower UUID first), add `UNIQUE(person_id, related_to_id, rel_type)`, and dedupe in `spousesOf`.

**F-7 — Single-anchor invariant is unenforced and non-transactional; anchor can end up 0 or many.**
`src/db/schema.ts:32`, `src/db/persons.ts:84-95`. `setAnchorPerson` clears all anchors then sets one, in two separate statements with no transaction. Passing an id that does not exist (e.g. a person deleted in another tab) clears the anchor and sets nothing → `FamilyTreeCanvas.tsx:170` finds no anchor → `coords` returns empty (line 176) → every card disappears while `persons.length` still shows N. Verified: `UPDATE persons SET is_anchor=1` yields 2+ anchors with no constraint violation.
Anchor identity is additionally duplicated in zustand (`treeStore.ts:14,86`) and only the DB copy is authoritative for the canvas — `handleSetAnchor` (`FamilyTreeCanvas.tsx:146-153`) patches local state manually instead of reloading, so a failed DB write leaves the UI lying.
Fix: move anchor to a single-row `meta` table (or `CREATE UNIQUE INDEX ... ON persons(is_anchor) WHERE is_anchor = 1`), wrap in `BEGIN/COMMIT`, and verify the target row exists first.

**F-8 — `rowToObject` boolean conversion is a hardcoded allowlist; `is_primary` is already broken.**
`src/db/persons.ts:9-20` converts only `is_living` and `is_anchor`. `getAllRelationships` uses the same mapper (`persons.ts:149`), so `Relationship.is_primary` — typed `boolean` at `types.ts:44` — is a `number` at runtime. Verified in Node: `{"is_primary":1}`, `is_primary === true` → `false`. This is the *same* bug class the changelog claims fixed for `is_anchor` (`.plan/plan.md:92`); the fix was applied to the symptom, not the mechanism. Any future boolean column repeats it silently, and `tsc` cannot catch it because the mapper launders through `as unknown as Person` (`persons.ts:32,149`).
Fix: derive the mapper from a single column→type descriptor shared with the DDL, or validate rows with `zod` (already a dependency, currently unused) at the DB boundary.

**F-9 — Explicit `NULL` defeats every column DEFAULT; `NULL is_living` reads back as "deceased".**
`src/db/persons.ts:43-66` lists all defaulted columns explicitly and `escapeSql(undefined)` → `"NULL"` (`persons.ts:37`). Verified: `INSERT ... (gender, is_living, is_anchor) VALUES (NULL, NULL, NULL)` stores NULLs — DEFAULTs do **not** apply. Today `QuickAddForm.tsx:76-84` omits `is_anchor` → stored `NULL`, not `0`. A CSV/GEDCOM importer that omits `is_living` will store `NULL`, and `rowToObject` maps `NULL → false` (verified) → every imported living relative gets a ✝ badge (`PersonCard.tsx:148`). `NULL gender` maps to `null` → `PersonCard.tsx:84` silently falls back to the OTHER gradient and `getRelationLabel` classifies them as female (`FamilyTreeCanvas.tsx:23`).
Fix: `NOT NULL DEFAULT` on `gender`, `is_living`, `is_anchor`, `is_primary` + `CHECK (x IN (0,1))`; omit defaulted columns from INSERT, or coalesce in the DB layer.

**F-10 — `updatePerson` interpolates caller-supplied column names into SQL and breaks on an empty patch.**
`src/db/persons.ts:102-108`. Keys go into the statement unescaped (`${k} = ...`). Verified in Node: a key of `"notes = 'x', is_anchor"` produces `notes = 'x', is_anchor = '1'` — a mass-assignment/column-injection primitive. TypeScript is not a runtime boundary; the planned CSV/GEDCOM import maps *file headers* to columns, which is exactly the untrusted path. Separately, `updatePerson(id, {})` emits `UPDATE persons SET , updated_at = ...` — verified `near ",": syntax error`. And `Partial<Person>` with an explicitly-`undefined` value nulls a required column (`Object.entries({a: undefined})` yields the key).
Note: `escapeSql` handles quote escaping correctly for *values* (`O'Brien; DROP TABLE persons;--` → safely quoted), but `NaN`/`Infinity` are emitted bare (verified `escapeSql(NaN) === "NaN"`) which SQLite parses as an identifier → runtime error.
Fix: switch to sql.js parameter binding (`db.run(sql, params)` / `db.prepare`), validate keys against a hardcoded column allowlist, early-return on an empty patch.

**F-11 — No transactions anywhere; multi-statement invariants can half-apply.**
Grep confirms zero `BEGIN`/`COMMIT` in `src/`. Affected: `deletePerson` (`persons.ts:112-119`, edges deleted then person — a failure between them orphans/loses edges), `setAnchorPerson` (F-7), `seedDemoData` (F-4), and the caller-level compound op in `QuickAddForm.tsx:76-129` where the person is persisted *before* the relationship, and each spouse direction is its own persisted write. Result: a disconnected person or a half-married couple. Each step also does a full `db.export()` (`client.ts:86`) → adding one spouse rewrites the entire SQLite file to IndexedDB 3×; with Drive sync this becomes 3 whole-file uploads.
Fix: expose a `withTransaction(fn)` helper in `client.ts` that wraps `BEGIN IMMEDIATE`/`COMMIT`/`ROLLBACK` and persists **once** at the end; make relationship-creating flows one unit of work.

### Medium

**F-12 — `columns` fallback swallows a broken result shape and returns objects with no fields.**
`src/db/persons.ts:29` and `:146`: `rowObj.columns || rowObj.lc || []`. If neither exists, `columns` is `[]`, `rowToObject` returns `{}`, and `getAllPersons()` resolves to `[{}, {}, {}]` — the UI shows N blank cards and no error. The `lc` branch is an undocumented minifier workaround (see `.plan/plan.md:82`) with no comment explaining which build produced it. Fix: throw on a missing column list; document or delete the `lc` fallback.

**F-13 — Debug leftovers in the write path.**
`src/db/persons.ts:70-78` runs an extra `SELECT * FROM persons` after **every** insert purely to `console.log` a count — a full table read per write, growing linearly with the tree. `persons.ts:70,89,258` log on every mutation. `catch (err: any)` at `:76,:90` re-throws after logging (harmless, but it is the only error handling in the file and it is redundant). Remove.

**F-14 — No CHECK constraints on enums or dates; garbage is insertable and silently invisible.**
Verified: `rel_type = 'PARNET_OF'` inserted fine (typo'd edge is then dropped by every reader's filter — data present, relationship invisible, no error). `birth_month = 77`, `birth_day = 99`, `death_year (1900) < birth_year (2020)` all accepted. `seedDemoData`'s helper types `rel_type` as plain `string` (`persons.ts:217`), bypassing `RelationshipType`. Fix: `CHECK (rel_type IN (...))`, `CHECK (gender IN (...))`, month/day range checks, `CHECK (death_year IS NULL OR birth_year IS NULL OR death_year >= birth_year)`.

**F-15 — No indexes on `relationships`; traversal is O(persons × relationships) in JS.**
Verified: only the two implicit PK autoindexes exist. Today every read is a full-table `SELECT *` into memory, so indexes buy nothing *yet* — but `getRelationLabel` is called per card and performs 4+ full `relationships.filter()` passes (`FamilyTreeCanvas.tsx:40-81`), and `coords` nests `childrenOf`/`parentsOf` filters inside loops (`FamilyTreeCanvas.tsx:179-274`). At ~500 persons / ~1500 edges this is millions of comparisons per render. Fix: build adjacency `Map`s once per data load (memoized), and add `idx_rel_person`, `idx_rel_related`, `idx_persons_last_first` before the first selective query ships.

**F-16 — `created_at`/`updated_at` exist in the DDL but not in the TS type or the created object.**
`schema.ts:33-34` vs `types.ts:3-31`. `SELECT *` returns them (so runtime `Person` objects carry untyped extra fields), but `createPerson` returns a hand-built object without them (`persons.ts:46`) and hands it straight to the store (`QuickAddForm.tsx:85`). The same person therefore has a different shape depending on whether it came from a write or a read — which will matter for sync conflict resolution (last-write-wins needs a trustworthy `updated_at`). Also note `updated_at` is only touched by `updatePerson`, which is dead code (F-17).

**F-17 — `updatePerson` and `deletePerson` in the DB layer are never called; there is no persisted edit or delete path.**
Grep: the only `updatePerson`/`deletePerson` call sites are the zustand in-memory versions (`treeStore.ts:62,68`, used at `FamilyTreeCanvas.tsx:149-150`). Edits and deletions made in the UI never reach SQLite and vanish on reload. This also means the injection and empty-patch defects in F-10 are latent and completely untested.

**F-18 — `ADOPTED_PARENT_OF` and `EX_SPOUSE` are read but never written; `sibling` silently no-ops.**
`types.ts:36-37` and `FamilyTreeCanvas.tsx:29,34` handle both, but no writer produces them (`QuickAddForm.tsx:96-117` only writes `PARENT_OF`/`SPOUSE`). Worse, `QuickAddForm.tsx:119-126` handles `sibling` with a `console.warn` and closes the form successfully — the user asked for a sibling, got a floating person with no edge, dumped to the "unassigned" row (`FamilyTreeCanvas.tsx:276-282`), and received no feedback. Fix: either implement sibling-via-shared-parents or disable the (+) affordance until it exists.

### Low

**F-19 — `getLifeSpan` hides the birth year of a deceased person with unknown death year.**
`PersonCard.tsx:31-37`: `!is_living && death` is required for the range, otherwise it renders `Sinh 1938` — identical to a living person. The seed creates exactly this state (`persons.ts:176-177`: `is_living: false`, no `death_year`). Genealogically valid data, UI-level fix: render `1938 – ?`.

**F-20 — 5 `no-explicit-any` lint errors in `src/db`, one of them meaningless.**
`persons.ts:28,76,90,145,209`. `persons.ts:209` casts `(person as any).death_year` even though `death_year` is declared on `Person` (`types.ts:16`) — copy-paste widening with no cause. `schema.ts:7,56` take `db: any` with eslint-disable comments instead of `import("sql.js").Database`, which `client.ts` already uses correctly.

**F-21 — `getAllPersons` sort order is not locale-aware.**
`persons.ts:24-26`: `ORDER BY last_name, first_name` uses SQLite BINARY collation — Vietnamese diacritics sort wrong (e.g. `Đ` after `Z`), and `NULL last_name` sorts first. Low impact today (the canvas ignores order), but it will surface in any list/export view. Sort in JS with `Intl.Collator("vi")`.

## Proposed Schema Changes

Additive-only where possible so existing files can be migrated with `ALTER TABLE`, which SQLite supports without a table rewrite (note: `ADD COLUMN` cannot be `NOT NULL` without a `DEFAULT` — always supply one).

```sql
-- 0. Version + app state out of the domain table
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);                                    -- rows: schema_version, anchor_person_id, locale
PRAGMA user_version = 2;              -- authoritative migration counter

-- 1. persons: domain gaps (F-matrix reqs 1,4,5,8)
ALTER TABLE persons ADD COLUMN nickname TEXT;
ALTER TABLE persons ADD COLUMN name_en TEXT;                  -- or a person_names(person_id, lang, ...) table if >2 locales
ALTER TABLE persons ADD COLUMN birth_lunar_day   INTEGER;
ALTER TABLE persons ADD COLUMN birth_lunar_month INTEGER;
ALTER TABLE persons ADD COLUMN birth_lunar_leap  INTEGER DEFAULT 0;
ALTER TABLE persons ADD COLUMN death_lunar_day   INTEGER;      -- ngày giỗ, structured
ALTER TABLE persons ADD COLUMN death_lunar_month INTEGER;
ALTER TABLE persons ADD COLUMN death_lunar_leap  INTEGER DEFAULT 0;
ALTER TABLE persons ADD COLUMN can_chi_year TEXT;             -- cache; derivable from birth_year
ALTER TABLE persons ADD COLUMN home_lat REAL;
ALTER TABLE persons ADD COLUMN home_lng REAL;
ALTER TABLE persons ADD COLUMN home_place_id TEXT;
ALTER TABLE persons ADD COLUMN burial_lat REAL;
ALTER TABLE persons ADD COLUMN burial_lng REAL;
ALTER TABLE persons ADD COLUMN generation INTEGER;             -- derived cache, recomputed on write
ALTER TABLE persons ADD COLUMN external_ref TEXT;             -- GEDCOM xref for idempotent re-import
ALTER TABLE persons ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;
-- keep death_lunar TEXT for one release as the legacy free-text field, then drop

-- 2. Marriage needs identity (req 2) — new table, no rewrite of relationships
CREATE TABLE IF NOT EXISTS unions (
  id           TEXT PRIMARY KEY,
  spouse_a_id  TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  spouse_b_id  TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  seq          INTEGER NOT NULL DEFAULT 1,          -- vợ cả / vợ hai...
  status       TEXT NOT NULL DEFAULT 'MARRIED'
               CHECK (status IN ('MARRIED','DIVORCED','WIDOWED','PARTNER')),
  start_year   INTEGER, start_month INTEGER, start_day INTEGER,
  end_year     INTEGER, end_month INTEGER, end_day INTEGER,
  is_primary   INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
  CHECK (spouse_a_id <> spouse_b_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_union_pair ON unions(spouse_a_id, spouse_b_id);
-- canonical ordering rule enforced in code: spouse_a_id < spouse_b_id (string compare)

-- 3. Parentage: role + optional union link (req 3)
ALTER TABLE relationships ADD COLUMN parent_role TEXT;   -- BIOLOGICAL|ADOPTED|STEP|FOSTER
ALTER TABLE relationships ADD COLUMN union_id TEXT;      -- which marriage produced this child
UPDATE relationships SET parent_role = 'BIOLOGICAL' WHERE rel_type = 'PARENT_OF';
UPDATE relationships SET parent_role = 'ADOPTED'    WHERE rel_type = 'ADOPTED_PARENT_OF';

-- 4. Integrity (F-3, F-6, F-7, F-14)
CREATE UNIQUE INDEX IF NOT EXISTS ux_rel_edge   ON relationships(person_id, related_to_id, rel_type);
CREATE        INDEX IF NOT EXISTS idx_rel_person  ON relationships(person_id);
CREATE        INDEX IF NOT EXISTS idx_rel_related ON relationships(related_to_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_single_anchor ON persons(is_anchor) WHERE is_anchor = 1;
CREATE        INDEX IF NOT EXISTS idx_persons_name ON persons(last_name, first_name);

-- 5. V3 placeholder (plan .plan/02-database-schema.md:69-78) — add when V3 starts, not now
```

`CHECK (person_id <> related_to_id)`, `CHECK (rel_type IN (...))`, `NOT NULL DEFAULT` on the boolean/enum columns, and `ON DELETE CASCADE` cannot be added by `ALTER TABLE`. They require the standard SQLite 12-step table rebuild (`CREATE relationships_new ... ; INSERT INTO relationships_new SELECT ... ; DROP old; RENAME`), which must run inside the migration transaction with `PRAGMA foreign_keys = OFF` for the duration.

### Migration strategy for already-synced Drive files

1. **Stop wiping.** Delete the `clearIndexedDB()` branch in `client.ts:30-36`. Replace with `migrate(db)`.
2. **Version by `PRAGMA user_version`**, not by column sniffing. `isSchemaValid` becomes a post-migration assertion only.
3. **Backfill v0 → v1:** any existing file has `user_version = 0`. Treat "0 + `persons` table exists" as legacy; run the full additive migration chain. Also `SELECT` the actual `PRAGMA table_info(persons)` and `ADD COLUMN` only what is missing — this is the only way to repair the F-1 half-shaped databases already in the wild.
4. **Backup before migrating:** write the pre-migration `db.export()` bytes to IndexedDB key `main.bak.<user_version>` (and, once Drive sync exists, upload as a separate named revision) *before* `BEGIN`. Keep the last 2.
5. **Atomic:** `BEGIN IMMEDIATE` → all steps → `PRAGMA user_version = N` → `COMMIT`; on any throw, `ROLLBACK`, keep the old file untouched, and surface a "cannot open, export your data" screen instead of silently starting empty.
6. **Downgrade guard:** if `user_version > CODE_VERSION` (older PWA shell hits a newer Drive file, which will happen with stale service-worker caches), refuse to write and tell the user to update — do not silently write with an older schema.
7. **Data repair pass** as its own migration step: delete orphan `relationships` rows, delete self-edges, dedupe mirrored SPOUSE rows into canonical form (F-6), coalesce `NULL` `is_living`/`gender`/`is_anchor` to defaults (F-9), and reduce multi-anchor to one — all required before the new constraints can be applied.

## Codex Cross-Review

Independent run: `codex exec` over the same four files. 20 findings; reconciliation below. Codex's line references are mostly accurate; two are off and one conclusion is overstated.

| # | Codex finding | Verdict | Evidence |
|---|---|---|---|
| 1 | No `user_version`/migration; wipe-on-stale; `isSchemaValid` checks only 5 cols so added columns are missed and inserts fail; header comment claims "DROP + CREATE" but no DROP | **AGREE** | Independently found (F-1). Empirically proven: legacy-shaped DB → validator `5/5` true → INSERT fails `no such column: middle_name`. Comment `schema.ts:3` vs `CREATE TABLE IF NOT EXISTS` `schema.ts:9` |
| 2 | FKs declared but unenforced (SQLite default off, no `PRAGMA foreign_keys=ON`), no `ON DELETE`, `createRelationship` validates nothing, `deletePerson` non-transactional | **AGREE** | F-3, F-11. `pragma_foreign_keys` = 0 verified; orphan row insert succeeded; grep shows no `PRAGMA foreign_keys` in `src/` |
| 3 | Self-parent and longer ancestor cycles insertable; needs recursive ancestor check, not just a self-check | **AGREE** | F-3. Verified: self `PARENT_OF` and A→B→A both inserted with no error |
| 4 | Marriage model cannot express overlap/ordering/dissolution; "cannot say which spouse co-parented which child"; needs a union entity | **AGREE / PARTIAL** | Union gap agreed (F-matrix req 2). **Disagree on co-parentage**: `PARENT_OF` is stored per-parent, so a child's mother and father are both explicit — `persons.ts:251-252` writes anchor *and* spouse as separate `PARENT_OF` edges. Co-parentage is already determinable; what is missing is the *marriage* that produced it |
| 5 | Missing storage: nickname, bilingual names, lat/lng, structured lunar + Can Chi, step-parentage, marriage ordering, media, GEDCOM xref; `death_lunar TEXT` is opaque | **AGREE** | F-matrix reqs 1,4,5,8. Grep confirms none of these columns exist in `schema.ts:9-35` |
| 6 | `PARENT_OF` vs `ADOPTED_PARENT_OF` too lossy; no step/foster/legal parentage metadata | **AGREE** | `types.ts:33-37`. Adds to my F-18: `ADOPTED_PARENT_OF` is also never *written* by any caller |
| 7 | Spouse stored bidirectionally by QuickAddForm, unidirectionally by seed; readers treat it as undirected → duplicate IDs, unstable layout, no unique constraint, relationship count inflated | **AGREE** | F-6. Independently found; duplicate-edge insert verified; layout consequence traced to `FamilyTreeCanvas.tsx:186` |
| 8 | No `NOT NULL`/`CHECK (IN (0,1))` on booleans/enums; `rowToObject` omits `is_primary` so `Relationship.is_primary` is a number despite being typed `boolean` | **AGREE** | F-8. Node repro: `is_primary === true` → `false`, `typeof` `number` |
| 9 | Explicit `NULL` in INSERT defeats DDL defaults; `updatePerson` turns explicit `undefined` into `NULL` on required fields | **AGREE** | F-9. Verified: `INSERT (gender,is_living,is_anchor) VALUES (NULL,NULL,NULL)` stores NULL, defaults not applied |
| 10 | Single-anchor invariant unenforced; two non-transactional updates; nonexistent id clears the anchor and sets none | **AGREE** | F-7. `persons.ts:87-88`; multi-anchor `UPDATE` verified |
| 11 | Mutations are not atomic with persistence; a `saveDb()` failure leaves RAM ahead of disk and a later save can persist a "failed" change; quick-add can persist a person without its relationship | **AGREE** | F-11. `persons.ts:69-80` mutates then `saveDb()`; `QuickAddForm.tsx:76-129` is two-to-three separate persisted writes |
| 12 | `seedDemoData` unconditionally destroys real data, no guard/backup/transaction | **AGREE** | F-4, and stronger than Codex states: it is also exposed on `window.__giapha` in production (`page.tsx:19-21`) — Codex did not read `page.tsx` |
| 13 | IndexedDB read failure is indistinguishable from "no data" → empty DB persisted over recoverable data | **AGREE** | F-2. `client.ts:80-82` bare `catch { return null }` → `client.ts:40-42` |
| 14 | `getDb()` assigns `dbInstance` after awaits → concurrent first calls build two DBs; `persistDb` not serialized so an older snapshot can overwrite a newer one | **AGREE** (second half partly theoretical) | F-5. The double-init is reachable today via `FamilyTreeCanvas.tsx:136` `Promise.all`. Out-of-order persist needs two concurrent `saveDb()` calls; every current call site awaits sequentially, so it is latent rather than active — still worth the write queue |
| 15 | No enum/date/life-state CHECKs; month 99, death before birth, deceased with no death data all legal; no date-precision marker | **AGREE** | F-14. Verified `birth_month=77`, `birth_day=99`, `death_year < birth_year` all accepted |
| 16 | Manual escaping instead of prepared statements; `NaN`/`Infinity` unsafe; `updatePerson` interpolates property *names* — a real runtime hole for GEDCOM/CSV ingestion | **AGREE** | F-10. Value escaping is actually correct for quotes (verified), but `escapeSql(NaN)` → bare `NaN` and the column-name path is injectable (verified) |
| 17 | No indexes on `person_id`/`related_to_id`/`rel_type`; no uniqueness for a logical edge | **AGREE** (severity lower today) | F-15. Only the 2 PK autoindexes exist. Since all reads are full-table `SELECT *`, indexes are a prerequisite for future selective queries, not a current bottleneck |
| 18 | Traversal is repeated full scanning ≈ O(persons × relationships); layout hard-coded to 5 tiers, everyone else "unassigned" | **AGREE**, line off | F-15. The unassigned block is `FamilyTreeCanvas.tsx:276-282`, not `:261` (`:261` is the grandchildren block) |
| 19 | Kinship labels ambiguous (`Bác/Chú/Cậu`) because the model lacks birth order and side-of-family; missing `birth_year` defaults to `9999` and mis-classifies age | **AGREE** | `FamilyTreeCanvas.tsx:48-52,78`. `9999` sentinel means two people with unknown birth years both resolve to "Anh/Chị" |
| 20 | Quick-add "sibling" persists a person with no relationship and closes successfully | **AGREE** | F-18. `QuickAddForm.tsx:119-126` — `console.warn` only, no user-facing error |

Codex missed (found only here): F-12 (`rowObj.lc` fallback silently yielding empty objects), F-13 (debug `SELECT * FROM persons` on every insert), F-16 (`created_at`/`updated_at` absent from `types.ts` and from the object `createPerson` returns), F-17 (`updatePerson`/`deletePerson` are unreachable — no persisted edit/delete path at all), F-21 (non-locale-aware sort), the empty-patch SQL syntax error, and the `window.__giapha` production exposure.

## Unresolved Questions

1. **Conflict resolution for Drive sync** is undecided and it constrains the schema now. Two devices editing offline need either per-row `updated_at` + tombstones (`deleted_at`) or a CRDT/oplog table. Whole-file last-write-wins (the current `db.export()` model) silently discards the loser's entire tree. This should be settled before v0.7, because tombstones are an additive migration but an oplog is not.
2. **Is `is_primary` on `relationships` meant to mean "vợ cả" (spouse rank) or "primary parent"?** It is written for both `SPOUSE` and `PARENT_OF` rows (`persons.ts:224` vs `:244`, where the mother gets `0`) and read by nothing. Semantics need a decision before the `unions.seq` migration, otherwise the backfill is a guess.
3. **Should `generation` be a stored column or always derived?** Stored is needed for the name-collision-vs-ancestors feature at scale and for GEDCOM export ordering, but it must be recomputed on every parentage write and is a cycle-detection dependency (F-3).
4. **Multi-family / multi-tree per file?** No `tree_id` anywhere. If a user maintains their paternal and maternal họ separately, or merges a spouse's gia phả, the current single-anchor-per-file model breaks. Cheap to add now (`ALTER TABLE ... ADD COLUMN tree_id`), expensive later.
5. **`OTHER` gender vs GEDCOM.** GEDCOM 5.5.1 `SEX` accepts `M`/`F`/`U`/`X` — confirm the intended mapping and whether `NULL` gender must round-trip as `U`.
6. **No test infrastructure exists** (no runner in `package.json`). Every empirical claim above was verified against a scratch SQLite DB and Node repros rather than against project tests. Migration work without a test harness is high-risk; recommend a minimal `node:test` + `sql.js` suite covering the migration chain before touching the DDL.
