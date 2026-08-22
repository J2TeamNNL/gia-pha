---
title: "Migration v0/v1 → v2 (user_version 2)"
description: "Versioned, backup-first migration from persons+relationships to the union-first-class model, validated end-to-end in sqlite3 with real before/after output."
status: pending
priority: P1
effort: 5h
branch: main
tags: [migration, sqlite, sql.js, data-safety]
created: 2026-08-22
---

# Migration v0/v1 → v2

Companion to `data-model.md` (same folder). That file owns the target DDL; this file owns getting
existing browser data there without losing any of it.

**All output below is real.** Host `sqlite3 3.51.0` for the migration run; the shipped
`public/sql-wasm.wasm` (**SQLite 3.49.1**, `OMIT_LOAD_EXTENSION` only) for every pragma/trigger
claim, because that is the engine the migration actually executes in.

Scripts used, kept out of the repo:
`/private/tmp/claude-501/-Users-hangvalong-Code-projects-gia-pha/d8a96923-2c55-40c9-b8ad-7296d65492a1/scratchpad/schema-design/`
— `01-old.sql` (verbatim DDL from `src/db/schema.ts:9-47`), `02-seed-hard-case.sql`,
`03-new-schema.sql`, `04-constraint-attack.sh`, `05-name-and-living-tests.sh`, `06-repair.sql`,
`06b-break-cycles.sh`, `07-transform.sql`, `08-path-ranking.sql`, `09-canonical-paths.sql`,
`verify-in-shipped-wasm.cjs`.

---

## 1 · Version scheme

`PRAGMA user_version` is the sole authority. No column sniffing, no `schema_meta` table.

| user_version | Meaning |
|---|---|
| `0` + a `persons` table exists | legacy v0/v1 file written by the current code |
| `0` + no tables | brand-new file |
| `2` | this model |
| `> CODE_VERSION` | a newer file in an older shell — **refuse to write**, tell the user to update |

`isSchemaValid()` is deleted as a gate. Its replacement is a **post-migration assertion**, run after
`COMMIT`, that fails loudly instead of wiping.

Verified in the shipped wasm:

```
sqlite_version in shipped wasm: 3.49.1
PASS  PRAGMA foreign_keys = ON takes effect
PASS  full v2 DDL loads
PASS  recursive-CTE cycle trigger created
PASS  PRAGMA user_version write+read in wasm
     note: foreign_keys after reopen = 0 (must be re-set per connection)
PASS  user_version survives export/reopen
     inside tx=1 (unchanged, no-op) / outside tx=0
PASS  PRAGMA foreign_keys inside a transaction is a no-op
     persons count 3 -> 3 after ROLLBACK
PASS  ROLLBACK restores pre-migration state
```

Three consequences, all load-bearing:

1. `user_version` **survives `db.export()` / reopen** — it is in the file header, so it works as the
   counter for a Drive-synced blob.
2. `PRAGMA foreign_keys` resets to **0 on every new connection**. It must be issued after every
   `new SQL.Database(bytes)`, not once at app start.
3. `PRAGMA foreign_keys` **inside a transaction is a no-op** (stayed `1` while `OFF` was issued).
   So `OFF` must be set *before* `BEGIN` and `ON` restored *after* `COMMIT`. This is why the
   migration is structured as pragma-then-transaction, not transaction-then-pragma.

---

## 2 · Backup, and why a wipe becomes structurally impossible

The current code has three verified paths to total loss:

- `client.ts:23-37` wipes IndexedDB when a 5-column heuristic fails. It never inspects
  `relationships` at all. The first column added in v0.6 silently deletes every tree.
- `client.ts:20-42` + `:80-82`: a transient `openIDB()` failure is swallowed to `return null`,
  after which a fresh **empty** DB is `put` over the existing key. No schema mismatch needed.
- `client.ts:85-94`: the snapshot is taken at `:86` but `openIDB()` at `:87`, so commit order
  follows connection-open timing — overlapping saves can commit a **stale** full export last. The
  add-relative flow fires 3 saves per click.

And there is no export path anywhere (`grep Blob|download|createObjectURL` → nothing), so iOS
WebKit's 7-day eviction is unmitigated.

### Mandatory pre-flight, in order. The migration does not start until all four succeed.

| Step | Action | Failure ⇒ |
|---|---|---|
| **P0** | `navigator.storage.persist()`; read the v1 bytes | abort, show recovery screen |
| **P1** | **Download a backup file to the user's disk** — `giapha-backup-v1-{ISO}.sqlite` via `Blob` + `createObjectURL`. Not another IndexedDB key: IndexedDB is precisely the store that can vanish | abort — this is a hard gate, the user must accept the download |
| **P2** | **Verify the backup**: open the downloaded bytes as a second `SQL.Database` and assert `count(persons)` and `count(relationships)` equal the source | abort, do not touch the original |
| **P3** | Write the migrated DB under a **new IndexedDB key** (`main.v2`), leaving the v1 blob at `main` untouched | abort, original still at `main` |

P3 is what makes the wipe structurally impossible rather than merely avoided. **Verified downgrade
hazard** — running the *current* `isSchemaValid` logic against both files:

```
old.db  -> required cols present? true  (old code KEEPS the file)
work.db -> required cols present? FALSE (old code CALLS clearIndexedDB() = total loss)
```

A stale service-worker shell running today's JS against a v2 file at key `main` would wipe it. Since
we cannot force every cached shell to update, the v2 file must live at a key old code never reads.

A read-compatibility shim was considered and **empirically rejected**: adding
`first_name TEXT GENERATED ALWAYS AS (given_name)` does not help, because generated columns are
invisible to `pragma_table_info`.

```
generated column added OK
still fails
old-code read path still works: Giáp
old-code WRITE path (must fail loudly, not corrupt): Error: in prepare, cannot INSERT into generated column "first_name"
--- STORED variant ---
STORED via ALTER: Error: stepping, cannot add a STORED column
table_info  : (absent)
table_xinfo : first_name
CREATE TABLE with a STORED generated column -> table_info sees: id,given_name
```

### Atomicity

In sql.js the durability unit is **the exported bytes**, not the SQL transaction: nothing is
persisted until every check passes, so a failure simply discards an in-memory database. SQL
transactions are still used for in-memory consistency (`BEGIN IMMEDIATE` … `COMMIT`), and `ROLLBACK`
was verified to restore state in the shipped wasm. Rollback procedure: discard the working
`Database`, keep `main` (still v1), keep the downloaded file, show "migration failed, your data is
untouched, here is your backup".

Retention: keep the last 2 pre-migration blobs plus the downloaded file. On Drive, push as a **new
file/revision — never overwrite in place** (etag/`If-Match` preconditions could not be confirmed on
`files.update`), and sync only on **user action** (a browser-only public OAuth client cannot hold a
refresh token, so there is no background sync).

---

## 3 · Ordered steps

FK enforcement is **OFF** for passes 1–2 (legacy data contains orphans that would abort the
transaction) and restored in pass 3. Each pass is idempotent: re-running it on an already-migrated
file is a no-op because `user_version` gates entry.

### Pass 0 — heal half-shaped legacy tables (JS, needs `PRAGMA table_info`)

`CREATE TABLE IF NOT EXISTS` never adds columns, so F-1 left real files with a v0.1-shaped `persons`
whose validator passed while every `INSERT` failed (`no column named middle_name`). Read
`PRAGMA table_info('persons')` and `ALTER TABLE ADD COLUMN` anything missing from the v1 list, so
pass 2's `SELECT` can name every column. `ADD COLUMN` cannot be `NOT NULL` without a `DEFAULT` —
all healed columns are nullable, which matches the v1 DDL.

### Pass 1 — repair (`06-repair.sql`)

Nothing is deleted before it is recorded in `_mig_report`.

| Step | What | Why |
|---|---|---|
| R1 | rows whose `rel_type` is outside the enum | F-14: `'PARNET_OF'` verified insertable; every reader filters it out, so the edge is invisible but present |
| R2 | orphan edges | F-3: verified insertable with FK off; blocks `PRAGMA foreign_keys=ON` |
| R3 | self-edges | F-3: self-parent verified insertable |
| R4 | mirrored/duplicate SPOUSE → canonical `(min,max)`, keep lowest rowid | F-6: `QuickAddForm.tsx:107-118` writes both directions, `persons.ts:224` writes one; readers treat SPOUSE as undirected so a quick-added spouse comes back twice |
| R5 | duplicate `(parent,child)` edges | the new PK `(child_id,parent_id)` forbids them |
| R6 | extra anchors → keep lowest rowid; NULL/out-of-range → 0 | F-7: multi-anchor verified; the new partial unique index forbids it |
| R7 | `gender` outside the enum → `'UNKNOWN'` | old DDL defaulted to `'MALE'` and allowed NULL and `'male'`. **Never guess a sex** — a wrong gender silently produces wrong bác/chú/cô vs cậu/dì |
| R8 | `is_living=1` with a death date → `0`; NULL stays NULL | a recorded death date is an assertion of death. NULL is **not** coerced to living: F-9 showed NULL already renders as deceased, which is equally a guess |
| R9 | record every `is_primary=1` spouse row | see the Codex reconciliation in `data-model.md` — the value means "written by the seeder", not "vợ cả", but it is preserved rather than dropped silently |

### Pass 1b — break ancestor cycles (`06b-break-cycles.sh`; a JS `while` loop in the real runner)

An edge `parent p → child c` is cycle-closing iff `p` is reachable as a **descendant** of `c`.
Delete the **highest-rowid** such edge (newest = most likely the data-entry mistake), record it,
repeat until none remain. Bound = number of parent edges.

Deleting *all* back-edges in one pass was rejected: on the test cycle
`giap→mot→chaua→chit→giap` every one of the 4 edges qualifies, so a single pass would destroy 3
legitimate parentages. The iterative rule removes exactly the injected mistake:

```
  iteration 1: cycle-closing edge rowid=26  r92 | PARENT_OF p-chit->p-giap
cycles broken: 1
```

### Pass 2 — transform (`07-transform.sql`)

1. `ALTER TABLE persons RENAME TO legacy_persons` — done **before** any v2 table exists, so
   SQLite's reference-rewriting on RENAME cannot reach into v2 DDL.
2. Create the v2 schema verbatim (the runner inlines `03-new-schema.sql`).
3. `persons`: `first_name→given_name`, `last_name→family_name`; `''`→NULL via `nullif(trim(…))`;
   phone `'0xxx'`→`'+84xxx'`, unparseable → NULL **and** appended to `notes`; `death_lunar` free
   text appended to `notes` **and** listed in the report, never parsed; `created_at/updated_at`
   `'Y-m-d H:M:S'` → ISO-8601 `…T…Z`; a row whose every name part is blank gets
   `display_name_vi='(chưa rõ tên)'` (a marked placeholder, not an invented name) plus a report entry.
4. `date_facts`: `BIRTH` / `DEATH` from the numeric columns, `calendar='GREGORIAN'` (those columns
   were solar-intent), `precision` inferred from which parts are present. **A day with no month is
   dropped and reported** — it is not a date and the CHECK would reject it.
5. `unions`: one per canonical spouse pair; `EX_SPOUSE→DIVORCED`, else `MARRIED`.
   **Widowhood is not inferred** — it is derived for display from the partner's `is_living`.
6. `union_partners`: `partner_seq=1` only when that person has exactly one union, else **NULL**.
   Multi-union people go to the review list — vợ cả order is not inferable from an unordered edge
   list.
7. `parentages`: `kind` from `rel_type`; `union_id` attached only when the child's **other** recorded
   parent is the co-partner of **exactly one** union with this parent, else `union_id=NULL` +
   `confidence='UNCERTAIN'`; `sibling_order` always NULL (D5: never inferred from birth year).
8. `app_settings` defaults + the `migration_report` JSON.
9. `DROP` `_pu`, `_up_src`, `_mig_report`, `relationships`, `legacy_persons`;
   `PRAGMA user_version = 2`; `COMMIT`.

### Pass 3 — post-conditions (abort and roll back on any failure)

`PRAGMA foreign_keys = ON` (new connection) → `PRAGMA foreign_key_check` → `PRAGMA integrity_check`
→ row-count reconciliation → integrity queries `I1`–`I11` → only then persist to `main.v2`.

---

## 4 · The hard case used for validation

Built in the OLD shape from the verbatim DDL, written the way the app actually writes:
**16 persons, 27 relationships.**

- ông Giáp with **3 wives** (bà Cả deceased 1940, bà Hai, bà Ba)
- 2 children by bà Cả, 1 by bà Hai, **1 child recorded with the father only** (mother ambiguous
  across 3 unions)
- **1 adopted child by both** ông Giáp and bà Hai (`ADOPTED_PARENT_OF` ×2)
- **cousin marriage**: Giáp's grandson (via son Một) marries Giáp's granddaughter (via daughter
  Hai), and they have a child — a genuinely cyclic pedigree
- 1 `EX_SPOUSE` union
- corrupt rows the reviewers proved insertable: orphan edge, self-parent edge, a cycle-closing edge,
  a typo'd `rel_type`
- data defects: 2 anchors, NULL `gender`, NULL `is_living`, `'male'` lowercase, `is_living=1` with a
  death year, legacy `'0912…'` phone, unparseable phone, free-text `death_lunar`

---

## 5 · Real before / after

```
=========== BEFORE (old.db) ===========
k                       v
----------------------  --
OLD persons             16
OLD relationships       27
OLD  PARENT_OF          16
OLD  ADOPTED_PARENT_OF  2
OLD  SPOUSE             7
OLD  EX_SPOUSE          1
OLD  invalid rel_type   1
OLD anchors             2
OLD user_version        0

=========== AFTER (work.db) ===========
k                   v
------------------  --
NEW persons         16
NEW unions          7
NEW union_partners  14
NEW parentages      15
NEW date_facts      17
NEW anchors         1
NEW app_settings    6
NEW user_version    2
```

Reconciliation, every number accounted for:

- **persons 16 → 16.** No person is lost, ever. Not even the nameless one or the ghost-edge targets
  (which never existed as persons).
- **parentages 15** = `16 PARENT_OF + 2 ADOPTED_PARENT_OF − 3` (R2 orphan, R3 self, 1b cycle).
- **unions 7** = `7 SPOUSE + 1 EX_SPOUSE − 1 mirrored duplicate` = 7 canonical pairs.
- **union_partners 14** = 7 × 2. Dyadic invariant holds.
- **date_facts 17** = 14 `BIRTH` + 3 `DEATH`. Two persons have no usable birth data; no `MEMORIAL`
  rows are created, because the free-text `death_lunar` is never parsed.
- **anchors 2 → 1.**
- **user_version 0 → 2.**

### Pass 3 output

```
foreign_key_check: (no rows) = 0 violations
integrity_check: ok

k                                             n
--------------------------------------------  -
I1 orphan parentage                           0
I2 ancestor cycle                             0
I3 union with 0 partners                      0
I4 union with 1 partner                       0
I5 union with >2 partners                     0
I6 living but has DEATH date                  0
I7 death before birth                         0
I8 duplicate sibling_order                    0
I9 anchors                                    1
I10 parentage union but parent not a partner   0
I11 nameless person                           0
```

### The headline requirement, after migration

```
########## ông Giáp's unions, in order, with children PER WIFE ##########
seq  wife         status   derived        n_children  children
---  -----------  -------  -------------  ----------  ----------------------------------
     Phạm Thị Ba  MARRIED                 0
     Trần Thị Cả  MARRIED  goá (derived)  2           Một [BIOLOGICAL], Hai [BIOLOGICAL]
     Lê Thị Hai   MARRIED                 2           Ba [BIOLOGICAL], Nuôi [ADOPTIVE]

########## children whose mother/union is NOT determinable ##########
child  confidence  source        notes
-----  ----------  ------------  ------------------
Mờ     UNCERTAIN   migration:v2  chưa rõ con bà nào

########## adoption — by BOTH partners vs by one person ##########
child  n_adoptive_parents  adopters  interpretation
-----  ------------------  --------  -------------------------------------
Nuôi   2                   Giáp+Hai  adopted by BOTH partners of one union
```

`seq` is blank on all three rows because ông Giáp has 3 unions and the legacy edge list carries no
order — that is the honest result, and it is on the review list.

### Consanguinity survives without cloning anyone

```
########## descendants of ông Giáp, ALL paths ##########
person  depth  n_blood_paths  via
------  -----  -------------  ----------------------------------
Anh     2      1              p-giap > p-mot > p-chaua
Bích    2      1              p-giap > p-haic > p-chaub
Chít    3      2              p-giap > p-mot > p-chaua > p-chit
Chít    3      2              p-giap > p-haic > p-chaub > p-chit

########## same ancestor at TWO DIFFERENT generation distances (uncle–niece union) ##########
ancestor  at_generations  n_path_depths
--------  --------------  -------------
Giáp      2,3             2

--- INVARIANT: one person_id, never a clone ---
walk_rows  distinct_persons  rows_in_persons_table
---------  ----------------  ---------------------
8          7                 7
```

`distinct_persons == rows_in_persons_table` is the invariant. And a real cycle is still refused
after all of this:

```
Error: stepping, parentage would create an ancestor cycle (19)
cycles present: 0
```

---

## 6 · Facts that cannot be inferred — the user review list

`app_settings['migration_report']` (JSON, 20 items in the validation run). The UI reads it once and
presents it as a checklist; each item links to the person and to the field to fill.

```
  unknown_rel_type_deleted         r93        PARNET_OF p-ba->p-mo
  orphan_edge_deleted              r90        PARENT_OF p-ghost-x->p-ghost-y
  self_edge_deleted                r91        PARENT_OF on p-mot
  mirrored_spouse_collapsed        r02        p-ca<->p-giap
  extra_anchor_cleared             p-null     was is_anchor=1
  gender_coerced_unknown           p-null     <NULL>
  gender_coerced_unknown           p-junk     male
  is_living_corrected_to_dead      p-junk     had death data but is_living=1
  is_living_unknown                p-null     left NULL, needs user confirmation
  legacy_is_primary_spouse         r01        p-giap<->p-ca is_primary=1
  legacy_is_primary_spouse         r03        p-giap<->p-hai is_primary=1
  legacy_is_primary_spouse         r14        p-mot<->p-vom is_primary=1
  legacy_is_primary_spouse         r15        p-haic<->p-chong is_primary=1
  legacy_is_primary_spouse         r20        p-chaua<->p-chaub is_primary=1
  cycle_edge_deleted               r92        PARENT_OF p-chit->p-giap
  death_lunar_needs_reentry        p-giap     12 tháng 7 âm
  death_lunar_needs_reentry        p-ca       20/11 AL
  phone_unparseable                p-junk     liên hệ qua Zalo con trai
  partner_seq_unknown              p-giap     has 3 unions, vợ cả/thứ order not recorded
  child_union_unresolved           p-mo       parent p-giap has 3 union(s); mother/union not determinable
```

| Cannot be inferred | Why | How the UI surfaces it | Also durable outside the report? |
|---|---|---|---|
| **which wife is a child's mother** when only the father was recorded | 3 candidate unions, nothing distinguishes them | blocking banner "1 người con chưa rõ mẹ" → picker listing the father's unions. Queryable directly: `parentages WHERE union_id IS NULL AND confidence='UNCERTAIN'` | yes — domain state, survives dismissal |
| **vợ cả / vợ hai order** | the legacy edge list is unordered | drag-to-order list on the person's unions. Queryable: `union_partners WHERE partner_seq IS NULL` | yes |
| **ngày giỗ** from `death_lunar` free text | `'12 tháng 7 âm'`, `'20/11 AL'` — parsing would guess the calendar, the leap flag and the day/month order. D4 forbids guessing | checklist item per person, raw string shown, one-tap "nhập ngày giỗ" opening the lunar picker | yes — appended to `notes` as `[ngày giỗ cần nhập lại] …`, cleared when the user enters the structured date |
| **sibling order** | birth years are usually missing above đời 3, and D5/D6 forbid deriving rank from age | non-blocking; the tree falls back to birth date then insertion order | n/a (NULL is a legitimate state) |
| **unparseable phone** | `'liên hệ qua Zalo con trai'` is not a number | field flagged in the editor | yes — appended to `notes` as `[SĐT không đọc được] …` |
| **gender** coerced to `UNKNOWN` | the old default `'MALE'` and NULL are both unreliable, and gender decides bác/chú/cô vs cậu/dì | checklist; the kinship engine already returns `CANNOT_DETERMINE` `GENDER(p)` for these people | yes — `gender='UNKNOWN'` is queryable |
| **is_living unknown** | NULL means nobody recorded it | checklist; the card shows years only, no marker (matching real clan practice) | yes — NULL is queryable |
| **deleted rows** (orphan / self / cycle / bad `rel_type`) | structurally impossible in v2 | collapsed "4 dòng dữ liệu lỗi đã được gỡ" with the raw values, and the download backup still has them | report only + the downloaded backup file |
| **`is_primary`** | means "written by the seeder", not vợ cả (verified: no call site passes it) | listed, not acted on | report only |

Items that are **queryable domain state** survive the user dismissing the report. Items that are
report-only are also in the mandatory downloaded backup file, which is why P1/P2 are hard gates.

---

## 7 · Adversarial constraint validation

Merged output of `04-constraint-attack.sh`, `05-name-and-living-tests.sh` and the `is_lineage`
check, all against the v2 DDL. `PASS rejected` = the constraint held. The `Error: stepping,` prefix
and the trailing `(19)` result code are trimmed from each message for width; nothing else is edited.

```
── persons ─────────────────────────────────────────
PASS  rejected  gender enum :: CHECK constraint failed: gender IN ('MALE','FEMALE','OTHER','UNKNOWN')
PASS  rejected  gender NOT NULL (explicit NULL) :: NOT NULL constraint failed: persons.gender
PASS  rejected  is_living out of range :: CHECK constraint failed: is_living IS NULL OR is_living IN (0,1)
PASS  accepted  DEFAULTs apply when omitted
PASS  rejected  phone must be +digits :: CHECK constraint failed: phone IS NULL OR phone GLOB '+[0-9]*'
PASS  accepted  phone +84 ok
PASS  rejected  email shape :: CHECK constraint failed: email IS NULL OR email LIKE '%_@_%.__%'
PASS  rejected  lat without lng :: CHECK constraint failed: (address_lat IS NULL) = (address_lng IS NULL)
PASS  accepted  lat+lng together
PASS  rejected  lat out of range :: CHECK constraint failed: address_lat IS NULL OR address_lat BETWEEN -90 AND 90
── names / living (web-recon cases) ────────────────
PASS  accepted  wife known only as 'Bà <husband>' (display_name_vi only, no parts)
PASS  accepted  nickname only
PASS  accepted  family_name only
PASS  rejected  completely nameless person :: CHECK constraint failed: coalesce(family_name, middle_name, given_name, nickname, display_name_vi) IS NOT NULL
PASS  rejected  all name parts explicitly NULL :: CHECK constraint failed: coalesce(...) IS NOT NULL
PASS  accepted  is_living unknown (NULL) allowed
PASS  accepted  is_living omitted -> NULL not 1        [w7.is_living = NULL]
PASS  rejected  is_living=2 still rejected
PASS  accepted  deceased with only a death year
── single anchor ───────────────────────────────────
PASS  accepted  first anchor
PASS  rejected  second anchor blocked :: UNIQUE constraint failed: persons.is_anchor
PASS  accepted  many zeros fine
── union_partners ──────────────────────────────────
PASS  rejected  3rd partner in a union :: union already has 2 partners
PASS  rejected  same person twice in union :: union already has 2 partners
PASS  accepted  A's 2nd union, seq 2
PASS  rejected  duplicate seq for same person :: UNIQUE constraint failed: union_partners.person_id, union_partners.partner_seq
PASS  accepted  two NULL seqs same person
PASS  rejected  partner_seq 0 :: CHECK constraint failed: partner_seq IS NULL OR partner_seq >= 1
PASS  rejected  orphan person_id (FK) :: FOREIGN KEY constraint failed
PASS  rejected  orphan union_id (FK) :: FOREIGN KEY constraint failed
── parentages ──────────────────────────────────────
PASS  accepted  normal parentage
PASS  rejected  self-parent :: parentage would create an ancestor cycle
PASS  rejected  duplicate (child,parent) :: UNIQUE constraint failed: parentages.child_id, parentages.parent_id
PASS  rejected  orphan child (FK) :: FOREIGN KEY constraint failed
PASS  rejected  kind enum :: CHECK constraint failed: kind IN ('BIOLOGICAL','ADOPTIVE','STEP','GUARDIAN','CLAIMED')
PASS  accepted  kind ADOPTIVE ok
PASS  rejected  2-cycle blocked (D->A, A->D) :: parentage would create an ancestor cycle
PASS  accepted  deep chain ok
PASS  rejected  3-cycle blocked (A<-F) :: parentage would create an ancestor cycle
PASS  rejected  cycle via UPDATE blocked :: parentage update would create an ancestor cycle
PASS  rejected  effective range inverted :: CHECK constraint failed
PASS  accepted  sibling_order tie allowed (twins)
PASS  rejected  second is_lineage=1 for same child :: UNIQUE constraint failed: parentages.child_id
── date_facts ──────────────────────────────────────
PASS  accepted  person BIRTH gregorian
PASS  rejected  no owner :: CHECK constraint failed: (person_id IS NOT NULL) <> (union_id IS NOT NULL)
PASS  rejected  two owners :: CHECK constraint failed: (person_id IS NOT NULL) <> (union_id IS NOT NULL)
PASS  rejected  person kind on union :: CHECK constraint failed
PASS  rejected  union kind on person :: CHECK constraint failed
PASS  accepted  wedding date on union
PASS  rejected  leap month on gregorian :: CHECK constraint failed: is_leap_month = 0 OR calendar = 'LUNAR_VN'
PASS  accepted  leap month on lunar
PASS  rejected  lunar day 31 :: CHECK constraint failed: calendar <> 'LUNAR_VN' OR day IS NULL OR day <= 30
PASS  accepted  gregorian day 31 ok
PASS  rejected  month 77 :: CHECK constraint failed: month IS NULL OR month BETWEEN 1 AND 12
PASS  rejected  empty date :: CHECK constraint failed: year IS NOT NULL OR month IS NOT NULL
PASS  accepted  MEMORIAL: no year, day+month
PASS  rejected  MONTH_ONLY with a day :: CHECK constraint failed
PASS  rejected  YEAR_ONLY with a month :: CHECK constraint failed
PASS  accepted  YEAR_ONLY clean
PASS  rejected  two BIRTHs for one person :: UNIQUE constraint failed: date_facts.person_id, date_facts.kind
PASS  accepted  DEATH+MEMORIAL coexist
── overrides ───────────────────────────────────────
PASS  accepted  directed override
PASS  accepted  reverse direction is separate
PASS  rejected  self override :: CHECK constraint failed: subject_id <> object_id
── cascade behaviour ───────────────────────────────
before delete A: 5 up / 5 par / 6 dates / 2 ovr / 6 unions
after  delete A: 3 up / 3 par / 5 dates / 0 ovr / 6 unions
foreign_key_check: clean
```

Also verified: **forest / disconnected components are normal**, not an error state.

```
roots (persons with no parentage row as child): 9
isolated (no parent AND no child AND no union): 7
path r1 -> r2 exists? (expect 0 = NO PATH, a valid answer): 0
```

Two findings the cascade block records for the implementation:

1. **Ghost unions.** Deleting a person cascades `union_partners`, `parentages`, `date_facts` and
   `relationship_overrides`, but **`unions` count stayed at 6**. A union whose partners are all
   deleted survives as a ghost. Deliberate — a 1-partner union is a legitimate "chồng không rõ tên"
   state — so the app must delete 0-partner unions in the same transaction as the person delete, and
   integrity queries `I3`/`I4` surface any that slip through.
2. **A day with no month.** Rejected by `CHECK (year IS NOT NULL OR month IS NOT NULL)`, which is
   why pass 2 must filter those rows out rather than let the migration abort.

---

## 8 · Test matrix (must exist before the DDL is implemented)

No test runner exists in `package.json`. Migration work without a harness is the single largest risk
in this plan.

| Level | Covers | Fixture |
|---|---|---|
| unit | every CHECK, every trigger, both partial unique indexes | `04-constraint-attack.sh` translated to `node:test` + `sql.js` |
| unit | name-nullability + tri-state `is_living` + forest traversal | `05-name-and-living-tests.sh` |
| unit | path-shape ranking: married cousins ⇒ vợ; grandparent ⇒ cháu; cháu dâu at depth 2 | `09-canonical-paths.sql` |
| integration | full v0→v2 chain, before/after counts, report contents | `01`+`02` → `06`/`06b`/`07` |
| integration | idempotence: run the chain twice, second run is a no-op | `user_version` gate |
| integration | failure injection: throw mid-pass-2 ⇒ `main` still v1, backup still valid | — |
| integration | half-shaped legacy DB (v0.1 columns only) ⇒ pass 0 heals it | subset of `01-old.sql` |
| e2e (wasm) | pragma semantics, trigger firing, `user_version` across export/reopen | `verify-in-shipped-wasm.cjs` |

---

## 9 · Rollback

| Failure point | State | Recovery |
|---|---|---|
| P0–P2 (backup not verified) | nothing touched | show recovery screen; migration never started |
| pass 1/1b/2 throws | working DB discarded; `main` still v1; nothing written to `main.v2` | retry, or "export your data" screen with the downloaded backup |
| pass 3 assertion fails | same — `main.v2` is written **only** after all assertions pass | report which assertion failed; data untouched |
| after `main.v2` is written, a defect is found later | both keys exist | point the app back at `main` (v1) by config, or re-import the downloaded backup |
| user opens the app in a stale shell | old code reads `main` (v1) and works | v2 data at `main.v2` cannot be reached, therefore cannot be wiped |

`main` (v1) is dropped only after the user has cleared the migration review list **and** confirmed
once. Until then, both copies exist.

---

## Unresolved Questions

1. **Do we ever delete the v1 blob at `main`?** Keeping it forever doubles storage (a concern under
   iOS eviction pressure and Drive quota) but is the only defence against a stale service-worker
   shell wiping `main.v2`. Proposal: keep until the review list is empty **and** the user confirms;
   needs a decision.
2. **Should pass 1b's cycle deletion be user-confirmed instead of automatic?** It is the only step
   that deletes a *plausible* edge (the others are structurally invalid). Automatic keeps the
   migration non-interactive; confirmation is safer but blocks startup. Current design: automatic +
   reported.
3. **Half-shaped legacy files in the wild — how many column shapes exist?** Pass 0 heals whatever
   `table_info` reports, but the v1 column list has to be hardcoded somewhere. Confirm it is exactly
   `src/db/schema.ts:9-35` and that no intermediate shape shipped.
4. **Is a second device actually in scope?** `decisions.md` leaves this open. If v1 is genuinely
   one machine, the entire Drive conflict-detection path drops out of this migration's concerns; if
   not, the "new file/revision, never overwrite" rule needs the conflict-copy naming decided here.
5. **`kinship_region` default `'BAC'`** is written by the migration as a default, not an assertion —
   confirm a first-run picker (also open in `data-model.md`).
