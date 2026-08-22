---
title: "Data model v2 — persons / unions / parentages / date_facts"
description: "Union-first-class SQLite schema for Vietnamese genealogy. Every DDL claim executed in sqlite3 and in the shipped sql.js 3.49.1 wasm."
status: pending
priority: P1
effort: 6h
branch: main
tags: [data-model, schema, sqlite, kinship, vietnamese]
created: 2026-08-22
---

# Data model v2

Scope: entity design, per-requirement satisfaction, query surface, privacy.
Spec engine xưng hô tách riêng ở [kinship.md](kinship.md). Kế hoạch migration ở `plans/260821-2350-restructure-v1/migration.md`.

**Verification.** Every DDL statement, CHECK, trigger and index below was executed. Two engines:
host `sqlite3 3.51.0`, and the build the app actually ships — `public/sql-wasm.wasm`, which
`strings` reports as **SQLite 3.49.1** with only `OMIT_LOAD_EXTENSION` (triggers + FK compiled in).
Adversarial results are pasted in `migration.md §7`. Anything not executed is tagged `[INFERENCE]`.

Design inputs, treated as settled: `decisions.md` D1–D8; `plans/reports/reviewer-260821-2312-data-model-db.md`;
`plans/reports/reviewer-260821-2312-sync-security-pwa.md`; `plans/reports/web-recon-260821-2312-competitor-web-demos.md`;
`plans/reports/fb-research/*`.

---

## 1 · Entity design

7 tables. `PRAGMA user_version` is the version counter — no `schema_meta` table.

### 1.1 `persons`

```sql
CREATE TABLE persons (
  id                TEXT PRIMARY KEY,
  family_name       TEXT,                       -- họ
  middle_name       TEXT,                       -- tên đệm
  given_name        TEXT,                       -- tên
  nickname          TEXT,                       -- tên thường gọi
  title_prefix      TEXT,                       -- Cụ / Ông / Bà / Cố — NOT part of the name
  display_name_vi   TEXT,                       -- override for names that do not decompose
  display_name_en   TEXT,                       -- a real distinct fact ("Andy Nguyen"), not a transform
  gender            TEXT    NOT NULL DEFAULT 'UNKNOWN'
                    CHECK (gender IN ('MALE','FEMALE','OTHER','UNKNOWN')),
  is_living         INTEGER CHECK (is_living IS NULL OR is_living IN (0,1)),   -- tri-state, NULL = unknown
  is_anchor         INTEGER NOT NULL DEFAULT 0 CHECK (is_anchor IN (0,1)),
  occupation        TEXT,
  avatar_url        TEXT,
  phone             TEXT    CHECK (phone IS NULL OR phone GLOB '+[0-9]*'),
  email             TEXT    CHECK (email IS NULL OR email LIKE '%_@_%.__%'),
  fb_url            TEXT,
  zalo_url          TEXT,
  address           TEXT,
  address_lat       REAL    CHECK (address_lat IS NULL OR address_lat BETWEEN -90 AND 90),
  address_lng       REAL    CHECK (address_lng IS NULL OR address_lng BETWEEN -180 AND 180),
  burial_place      TEXT,                       -- mộ phần
  burial_lat        REAL    CHECK (burial_lat IS NULL OR burial_lat BETWEEN -90 AND 90),
  burial_lng        REAL    CHECK (burial_lng IS NULL OR burial_lng BETWEEN -180 AND 180),
  biography         TEXT,
  notes             TEXT,
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  CHECK (coalesce(family_name, middle_name, given_name, nickname, display_name_vi) IS NOT NULL),
  CHECK ((address_lat IS NULL) = (address_lng IS NULL)),
  CHECK ((burial_lat  IS NULL) = (burial_lng  IS NULL))
);
CREATE UNIQUE INDEX ux_persons_single_anchor ON persons(is_anchor) WHERE is_anchor = 1;
CREATE INDEX idx_persons_name  ON persons(family_name, given_name);
CREATE INDEX idx_persons_given ON persons(given_name);
```

Purpose: the only identity in the system. `id` is the sole person key; nothing else identifies a person.

| Column | Rationale |
|---|---|
| `family_name` / `middle_name` / `given_name` | Renamed from `last_name`/`middle_name`/`first_name`. `first_name` is actively misleading in VN order (tên is positionally last). Rename is free: the migration is a table rebuild anyway (F-9/F-14 force it). |
| all three nullable | Forced by web-recon: real record `Bà Võ Văn Mượng` — a wife recorded only as "Bà ‹husband's full name›". `given_name NOT NULL` would force inventing a name. The table CHECK guarantees *something* renderable instead. |
| `title_prefix` | Forced by web-recon: honorifics found baked into the name field. Separating them keeps `family_name` sortable and stops "Bà" leaking into search. |
| `display_name_vi` | Escape hatch for names that do not decompose (monastic names, "Bà Tổ Cô", the Mượng case). NULL ⇒ app derives `họ đệm tên`. |
| `display_name_en` | A distinct fact, not a transform. Overseas relatives have real English names. |
| `gender NOT NULL DEFAULT 'UNKNOWN'` | Old DDL defaulted to `'MALE'` and allowed NULL — verified NULL then classified everyone as female at `FamilyTreeCanvas.tsx:23`. Gender drives bác/chú/cô vs cậu/dì, so a wrong default silently produces wrong kinship terms. `UNKNOWN` makes the engine say so. |
| `is_living` tri-state | Forced by web-recon #3: on the real clan site, deceased and living cards are byte-identical — the **years carry the meaning**, there is no marker. So the flag is not load-bearing for rendering. `NOT NULL DEFAULT 1` would re-create F-9 (imported NULL → ✝ on living relatives). NULL = "nobody recorded it". Still needed as a flag because "ông đã mất, không rõ năm" has no date. |
| `is_anchor` + partial unique index | F-7: `setAnchorPerson` clears all then sets one, non-transactionally; multi-anchor verified insertable. Partial unique index makes 2 anchors impossible at the DB level and cascades on delete (a settings row holding a person id cannot do either). |
| `phone` CHECK | `+84` normalisation enforced at the boundary. `zod` is a dependency with 0 usages; a CHECK is cheaper and cannot be bypassed. |
| `address_lat/lng`, `burial_lat/lng` | README promises "Google Maps chỉ đường tới nhà" and link1 asks for mộ location. Paired CHECK stops a half-coordinate. |
| `created_at` / `updated_at` TEXT ISO-8601 | Existing data; dropping them loses information. Not load-bearing (D2: whole-file snapshots, no row-level LWW). |
| no `generation` / `chi` / `nhánh` / `đời` | See §1.8. |

### 1.2 `unions`

```sql
CREATE TABLE unions (
  id       TEXT PRIMARY KEY,
  kind     TEXT NOT NULL DEFAULT 'MARRIAGE'
           CHECK (kind IN ('MARRIAGE','PARTNERSHIP','UNKNOWN')),
  status   TEXT NOT NULL DEFAULT 'MARRIED'
           CHECK (status IN ('MARRIED','DIVORCED','WIDOWED','SEPARATED','UNKNOWN')),
  notes    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
```

`status` is the single field for how the union stands. `WIDOWED` ≠ `DIVORCED` — the FB thread's
request #1. `WIDOWED` is stored (asserted) rather than only derived, because the derivation
`status='MARRIED' AND partner.is_living=0` misses the common case where the death was never
recorded. Precedence: **stored status wins**; when `status='MARRIED'` and a partner is deceased the
UI shows "goá" (derived). Integrity query `I6b` flags the pair for confirmation.

No `end_reason` — see *Deliberately Excluded*.

### 1.3 `union_partners`

```sql
CREATE TABLE union_partners (
  union_id    TEXT NOT NULL REFERENCES unions(id)  ON DELETE CASCADE,
  person_id   TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  partner_seq INTEGER CHECK (partner_seq IS NULL OR partner_seq >= 1),
  PRIMARY KEY (union_id, person_id)
);
CREATE INDEX idx_union_partners_person ON union_partners(person_id);
CREATE UNIQUE INDEX ux_union_partners_seq ON union_partners(person_id, partner_seq);

CREATE TRIGGER trg_union_partners_max2 BEFORE INSERT ON union_partners
WHEN (SELECT count(*) FROM union_partners WHERE union_id = NEW.union_id) >= 2
BEGIN SELECT RAISE(ABORT,'union already has 2 partners'); END;
```

**The key modelling decision.** `partner_seq` = *the rank of this union among **that person's** unions*.
A man with 3 wives carries seq 1/2/3 on **his** three rows (vợ cả / vợ hai / vợ ba); each wife carries
seq 1 on **her** own row. Polyandry is the identical mechanism with the roles swapped. No gender is
consulted anywhere, so the graph cannot be corrupted by a gender assumption (D3's explicit warning).

- `UNIQUE(person_id, partner_seq)` stops two unions claiming "vợ hai". SQLite treats NULLs as
  distinct — **verified**: two NULL-seq rows for the same person are accepted, so "order not
  recorded" is representable (mandatory: the FB thread says birth years and marriage order are
  usually missing above đời 3).
- Dyadic invariant enforced by trigger, not by convention. **Verified**: a 3rd partner is rejected,
  and inserting the same person twice into one union is also rejected.
- `ON DELETE CASCADE` on both FKs. Deleting a person does **not** delete the union row — verified,
  a 1-partner or 0-partner union survives. That is deliberate ("chồng không rõ tên" is a real
  state); integrity queries `I3`/`I4` surface it and the app deletes 0-partner unions in the same
  transaction as the person delete.

**Why this beats the flat-label approach** (GIAPHAX: `spouseIds[]` + `second_wife:"Vợ thứ"`,
`concubine:"Thứ thất"`): (i) an array of spouse ids cannot say which child belongs to which wife —
the #1 repeated request across all 5 FB posts, and the exact bug KinTree still ships despite being
paid; (ii) `"Thứ thất"` is a rendered string, so it cannot be sorted, filtered, or translated to
EN; (iii) it has no place for marriage status, so a dead wife and a divorced wife are the same row.

### 1.4 `parentages`

```sql
CREATE TABLE parentages (
  child_id            TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  parent_id           TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  union_id            TEXT          REFERENCES unions(id)  ON DELETE SET NULL,
  kind                TEXT NOT NULL DEFAULT 'BIOLOGICAL'
                      CHECK (kind IN ('BIOLOGICAL','ADOPTIVE','STEP','GUARDIAN','CLAIMED')),
  sibling_order       INTEGER CHECK (sibling_order IS NULL OR sibling_order >= 1),
  is_lineage          INTEGER NOT NULL DEFAULT 0 CHECK (is_lineage IN (0,1)),
  effective_from_year INTEGER,
  effective_to_year   INTEGER,
  confidence          TEXT NOT NULL DEFAULT 'ASSERTED'
                      CHECK (confidence IN ('CERTAIN','ASSERTED','UNCERTAIN')),
  source              TEXT,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (child_id, parent_id),
  CHECK (child_id <> parent_id),
  CHECK (effective_to_year IS NULL OR effective_from_year IS NULL
         OR effective_to_year >= effective_from_year)
);
CREATE INDEX idx_parentages_parent ON parentages(parent_id);
CREATE INDEX idx_parentages_union  ON parentages(union_id);
CREATE INDEX idx_parentages_order  ON parentages(parent_id, sibling_order);
CREATE UNIQUE INDEX ux_parentages_lineage ON parentages(child_id) WHERE is_lineage = 1;

CREATE TRIGGER trg_parentage_no_cycle_ins BEFORE INSERT ON parentages
WHEN EXISTS (
  WITH RECURSIVE anc(id) AS (
    SELECT NEW.parent_id
    UNION
    SELECT p.parent_id FROM parentages p JOIN anc ON p.child_id = anc.id
  )
  SELECT 1 FROM anc WHERE id = NEW.child_id
)
BEGIN SELECT RAISE(ABORT,'parentage would create an ancestor cycle'); END;

CREATE TRIGGER trg_parentage_no_cycle_upd BEFORE UPDATE OF child_id, parent_id ON parentages
WHEN EXISTS (
  WITH RECURSIVE anc(id) AS (
    SELECT NEW.parent_id
    UNION
    SELECT p.parent_id FROM parentages p
      JOIN anc ON p.child_id = anc.id
     WHERE NOT (p.child_id = OLD.child_id AND p.parent_id = OLD.parent_id)
  )
  SELECT 1 FROM anc WHERE id = NEW.child_id
)
BEGIN SELECT RAISE(ABORT,'parentage update would create an ancestor cycle'); END;
```

- **PK `(child_id, parent_id)`**, no surrogate id. Nothing addresses a parentage by opaque id; the
  natural key is stable and gives the "no duplicate parent" constraint for free.
- **`union_id` nullable, `ON DELETE SET NULL`.** Deleting a union must not delete children. NULL
  means "which marriage produced this child is not known" — the honest state for the migrated
  father-only child, and the state the UI must chase down.
- **`kind`** covers the four cases the requirements name plus `CLAIMED` (D3). Adoption *by both
  partners* vs *by one person* is not a `kind` value — it is the **row count**: two `ADOPTIVE` rows
  sharing one `union_id` vs one `ADOPTIVE` row. Verified in §3 below.
- **`sibling_order`** = rank of the child among **all children of that parent** (D5: order belongs
  to the parentage, not to the person). Order *within one union* is derived by filtering that
  parent's children to that union. One field yields both numbers the `codex-cross-review.md` §3 case "children from
  concurrent wives" demands (global paternal order vs order within each wife's children), because
  the father's row and the mother's row are separate rows. Ties are **allowed** (index, not unique
  index) — required for twins and for "coi như bằng vai"; duplicate-rank typos are surfaced by
  integrity query `I8`, not blocked.
- **`is_lineage`** — added after the Codex review. Forced by **con thừa tự**: a nephew adopted to
  continue an heirless branch keeps his biological father edge but belongs ritually to the adoptive
  father's chi. `kind` cannot express it (both edges are legitimate); the default rule "follow the
  biological father" gives the wrong branch. Partial unique index guarantees at most one
  lineage-defining parent per child — **verified**: the second `is_lineage=1` for the same child is
  rejected with `UNIQUE constraint failed: parentages.child_id`.
- **`effective_from_year` / `effective_to_year`** — year granularity only. D3 lists effective dates;
  "bố dượng từ năm 2001" is all anyone remembers. Year-only keeps them off `date_facts` and avoids a
  third polymorphic FK branch.
- **Cycle triggers.** F-3 verified that self-parent and A→B→A insert cleanly today, which would
  infinite-loop the planned ancestor walk. The recursive CTE in a trigger `WHEN` clause works in the
  shipped 3.49.1 wasm — verified there, not just on the host. `UNION` (not `UNION ALL`) makes the
  CTE terminate even if a cycle somehow pre-exists. `CHECK (child_id <> parent_id)` is kept as a
  backstop if a future rebuild drops the triggers.

### 1.5 `date_facts`

```sql
CREATE TABLE date_facts (
  id            TEXT PRIMARY KEY,
  person_id     TEXT REFERENCES persons(id) ON DELETE CASCADE,
  union_id      TEXT REFERENCES unions(id)  ON DELETE CASCADE,
  kind          TEXT NOT NULL
                CHECK (kind IN ('BIRTH','DEATH','MEMORIAL','UNION_START','UNION_END')),
  calendar      TEXT NOT NULL DEFAULT 'GREGORIAN'
                CHECK (calendar IN ('LUNAR_VN','GREGORIAN','UNKNOWN')),
  year          INTEGER,
  month         INTEGER CHECK (month IS NULL OR month BETWEEN 1 AND 12),
  day           INTEGER CHECK (day IS NULL OR day BETWEEN 1 AND 31),
  is_leap_month INTEGER NOT NULL DEFAULT 0 CHECK (is_leap_month IN (0,1)),
  precision     TEXT NOT NULL DEFAULT 'EXACT'
                CHECK (precision IN ('EXACT','MONTH_ONLY','YEAR_ONLY','APPROXIMATE')),
  confidence    TEXT NOT NULL DEFAULT 'ASSERTED'
                CHECK (confidence IN ('CERTAIN','ASSERTED','UNCERTAIN')),
  source        TEXT,
  CHECK ((person_id IS NOT NULL) <> (union_id IS NOT NULL)),
  CHECK ((kind IN ('BIRTH','DEATH','MEMORIAL')  AND person_id IS NOT NULL)
      OR (kind IN ('UNION_START','UNION_END')   AND union_id  IS NOT NULL)),
  CHECK (is_leap_month = 0 OR calendar = 'LUNAR_VN'),
  CHECK (calendar <> 'LUNAR_VN' OR day IS NULL OR day <= 30),
  CHECK (year IS NOT NULL OR month IS NOT NULL),
  CHECK (precision <> 'MONTH_ONLY' OR day IS NULL),
  CHECK (precision <> 'YEAR_ONLY'  OR (month IS NULL AND day IS NULL))
);
CREATE UNIQUE INDEX ux_date_facts_person ON date_facts(person_id, kind) WHERE person_id IS NOT NULL;
CREATE UNIQUE INDEX ux_date_facts_union  ON date_facts(union_id,  kind) WHERE union_id  IS NOT NULL;
CREATE INDEX idx_date_facts_recurring ON date_facts(kind, month, day);
```

One table for every dated fact. **Why not inline column groups on `persons`/`unions`:** the
requirements force 5 distinct date facts × 7 attributes (calendar, y, m, d, leap, precision,
confidence). Inlining = 35 columns with the 6 CHECK constraints repeated 5× — the exact "chia field
ngày quá nhiều trong Person model" defect a commenter called out publicly on giapha-os (link2 §9).
One shape means one set of rules, and `kind` becomes indexable, which is what makes the ngày-giỗ
query an index seek instead of a scan (§3 Q6, plan pasted).

- `CHECK ((person_id IS NOT NULL) <> (union_id IS NOT NULL))` — exactly one owner, so both FKs are
  real (a polymorphic `subject_type/subject_id` pair could not be). Verified: zero owners and two
  owners both rejected.
- `kind` ↔ owner CHECK stops a `BIRTH` on a union or a `UNION_START` on a person. Verified both.
- `MEMORIAL` is **separate from `DEATH`** (D4): the family's observed ngày giỗ may deliberately
  differ from the actual date of death, and is typically month+day with **no year** — hence
  `CHECK (year IS NOT NULL OR month IS NOT NULL)` rather than requiring a year. Verified: a
  `MEMORIAL` with month+day and no year is accepted; `DEATH` and `MEMORIAL` coexist for one person.
- `is_leap_month` is mandatory per D4 and CHECK-bound to `LUNAR_VN` (a Gregorian leap month is
  nonsense). Verified rejected on `GREGORIAN`, accepted on `LUNAR_VN`. `CHECK day <= 30` for lunar —
  a lunar month never has 31 days. Verified.
- `precision` CHECKs keep the value consistent with which parts are present: `MONTH_ONLY` with a day
  and `YEAR_ONLY` with a month are both rejected. Verified.
- **`UNION_START` is the wedding date.** The requirement lists "wedding date" per person; it is a
  property of the marriage, so a person's wedding date is read through their union. With 3 wives
  there are 3 wedding dates and no per-person column could hold them.
- **Can Chi is derived, not stored.** `can = (year+6) mod 10`, `chi = (year+8) mod 12` off the lunar
  year. Storing it would be a cache that can contradict `year`. The real input case "cụ sinh năm
  Giáp Tý, không rõ số" is handled without a column: the UI offers the candidate years from the
  60-cycle, the user picks one, `precision='APPROXIMATE'`, and Can Chi derives back exactly.
- `UNIQUE(person_id, kind)` — one birth, one death, one giỗ. Competing assertions are a
  multi-contributor problem, cut by D2.

### 1.6 `relationship_overrides`

```sql
CREATE TABLE relationship_overrides (
  subject_id         TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  object_id          TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  preferred_label_vi TEXT NOT NULL,
  preferred_label_en TEXT,
  reason             TEXT,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (subject_id, object_id),
  CHECK (subject_id <> object_id)
);
```

Directed: "A calls B chú" is not "B calls A chú". Verified both directions insert as separate rows
and a self-override is rejected. This is the resolution mechanism for every `plans/reports/fb-research/codex-cross-review.md` §3 case the engine
returns `CANNOT_DETERMINE` for, and for family-specific habit ("nhà mình vẫn gọi là anh").
Bilingual because the app is VI/EN.

### 1.7 `app_settings`

```sql
CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
```

Rows: `locale`, `kinship_region` (BAC/TRUNG/NAM), `leap_month_memorial_policy`,
`cousin_seniority_policy`, `schema_migrated_at`, `migration_report` (JSON).
These are **family facts, not device preferences** — they must survive a Drive restore onto another
device, so they live in the file, not in `localStorage`. No person ids are stored here (that is why
the anchor stayed on `persons` with a partial unique index — a settings row cannot have an FK or a
cascade, so it would dangle after a delete).

### 1.8 Generation / chi / nhánh / đời — **derived, not stored**

Defence, in order of force:

1. **The clan is a forest, not a tree.** Verified on a real published gia phả
   (`tocvoquangngai.com/pha-do`, 292 members): "ĐỜI 1" holds **106 records** — roughly 50 roots.
   A stored `generation` needs a single root to count from; there isn't one.
2. **A cyclic pedigree gives one person two different depths.** Verified: with an uncle–niece union,
   ông Giáp is an ancestor of the child at generation **2 and 3** simultaneously (`§3 Q10` output).
   Any single stored integer is a lie about one of the two paths.
3. It must be recomputed on every parentage write, and the recomputation itself depends on
   cycle-freedom — so it is a cache whose invalidation is strictly harder than the computation.
4. Cost is negligible: the whole derivation is one recursive CTE over an indexed `parentages` at
   300–1000 persons.

Derivation rules: **đời** = longest lineage-edge distance from the component's root set (use
`is_lineage` when set, else the biological father edge). **chi / nhánh** = the ordered sequence of
`sibling_order` values along that same lineage path from the root — i.e. `a2.c4` style codes,
exactly what a link2 commenter asked for. **Component/root** = `persons` with no parentage row as
child; multiple roots and fully isolated persons are the normal case, never an error.

The **viewer anchor** (`is_anchor`, exactly one, "tôi") is distinct from the **render focus**
(which person is centred on the canvas). The focus is ephemeral UI state and is not stored; it may
be in a different component from the anchor, and the canvas must render the focus's component rather
than going blank (today `FamilyTreeCanvas.tsx:170-176` returns empty coords when it cannot resolve
an anchor).

---

## 2 · Per-requirement satisfaction

| Requirement | How the DDL satisfies it | Verified |
|---|---|---|
| họ / tên đệm / tên separate + nickname + bilingual | `family_name`/`middle_name`/`given_name`/`nickname` + `display_name_vi`/`display_name_en` + `title_prefix`. All nullable; table CHECK guarantees something renderable | yes — "Bà Võ Văn Mượng" with zero name parts accepted; a fully nameless row rejected |
| Polygamy **and** polyandry, overlapping dyadic unions | N `unions`, 2 `union_partners` each, `partner_seq` per person. Gender never consulted | yes — 3 concurrent unions for one man; §3 Q1 |
| married / divorced / **widowed** | `unions.status` enum; widowhood also derivable from partner `is_living`; stored value wins | yes — §3 Q1 shows `MARRIED` + `goá (derived)` |
| child attributable to which union / which mother, with 3+ wives | `parentages.union_id` + `parentages(parent_id)` | yes — §3 Q1: 2 children per wife, correctly split |
| adoption by both partners vs by one person | row count of `ADOPTIVE` parentages sharing a `union_id` | yes — §3 Q3 |
| step-parent, guardian | `kind IN ('STEP','GUARDIAN')` + `effective_*_year` | yes — enum + inverted-range CHECK |
| con dâu / con rể / **cháu dâu** derived from a typed path, never stored | no in-law column exists anywhere; [kinship.md](kinship.md) §2 path expression | yes — §3 Q5 derives con dâu / cháu dâu / cháu rể at depth 1 and 2 |
| consanguineous marriage: same `person_id` via 2 blood paths + 1 affinal | schema permits a cyclic pedigree; renderer picks a spanning tree | yes — §3 Q4 / Q10 |
| deceased: date of death **and** ngày giỗ as separate facts | `date_facts.kind` `DEATH` vs `MEMORIAL` | yes — both coexist for one person |
| lunar/solar as asserted, `is_leap_month`, `precision` | `calendar` + `is_leap_month` + `precision`, CHECK-consistent | yes — leap month accepted on lunar, rejected on Gregorian |
| Can Chi derivable | derived from `year` + `calendar` | formula only `[INFERENCE]` |
| contextual sibling order + manual override | `parentages.sibling_order`, ties allowed, plus `relationship_overrides` | yes — tie accepted |
| avatar, phone(+84), Facebook, email, address, coords, occupation, notes, mộ phần, wedding date | `persons.*` + `date_facts.UNION_START` | yes — phone/email/coord CHECKs all exercised |
| generation / chi / nhánh / đời | derived (§1.8) | yes — two-depth ancestor case |

**The invariant that forbids cloning a person:** `persons.id` is the sole identity; `parentages`,
`union_partners`, `date_facts` and `relationship_overrides` all reference it by FK, and there is no
column anywhere holding a path, a rendered position, or a duplicate person record. Therefore for any
traversal, `count(DISTINCT id) == the number of real people`, no matter how many paths reach them.
Verified: an ancestor walk over the uncle–niece pedigree returned **8 walk rows / 7 distinct persons
/ 7 rows in `persons`**. The renderer may draw a person once (spanning tree) and draw cross-links
for the remaining edges, but it must key its node map on `person_id`.

---

## 3 · Query surface

All plans below are real `EXPLAIN QUERY PLAN` output on the migrated database.

| # | Query the UI needs | Supporting index | Plan |
|---|---|---|---|
| Q6 | upcoming ngày giỗ | `idx_date_facts_recurring(kind,month,day)` | `SEARCH date_facts USING INDEX idx_date_facts_recurring (kind=?)` |
| Q7 | name-collision vs all ancestors | `parentages` PK | `SEARCH parentages USING COVERING INDEX sqlite_autoindex_parentages_1 (child_id=?)` |
| Q12 | render subtree around anchor | `idx_parentages_parent`, `ux_union_partners_seq` | `SEARCH parentages USING INDEX idx_parentages_parent (parent_id=?)` / `SEARCH union_partners USING INDEX ux_union_partners_seq (person_id=?)` |
| Q14 | search by name | `idx_persons_name(family_name,given_name)` | `SEARCH persons USING INDEX idx_persons_name (family_name=?)` |
| Q1/Q13 | a person's unions + children per union | `ux_union_partners_seq`, `idx_parentages_union` | index seeks, single statement |

**Killing the N+1 and the full scans.** Today every read is `SELECT * FROM persons` /
`SELECT * FROM relationships` into memory, then `getRelationLabel` runs 4+ `relationships.filter()`
passes **per card** (`FamilyTreeCanvas.tsx:40-81`) and `coords` nests `childrenOf`/`parentsOf`
filters inside loops (`:179-274`) — millions of comparisons per render at 500 persons. Replacement:

1. Q12 returns the render set in **one** recursive-CTE statement (verified: 4 generation levels,
   9 people, one statement) — no per-card queries.
2. Adjacency `Map`s are built once per data load from 2 queries and memoised; the canvas reads maps,
   never re-filters arrays.
3. `getRelationLabel` is replaced by the kinship engine called with the memoised edge map.

**Double-count trap, found while validating:** `count(*)` over `parentages` grouped by `union_id`
returns *2× the children* (one row per parent per child). The per-union children count **must** be
`count(DISTINCT child_id)`. Verified: naive `count(*)` reported 4 children for a union that has 2.

**Vietnamese collation.** SQLite `BINARY` sorts `Cả` after `Chít`, and `Đức`/`Ánh` after `Zét`
(verified: `Anh | Bích | Cả | Giáp | ... | Zét | Ánh | Đức`). `Intl.Collator('vi')` gives
`Anh | Ánh | Bích | Cả | Đức | Giáp | ...`. Therefore: use the index for **filtering**
(`family_name=?`, prefix `LIKE`), and always sort the result set in JS with `Intl.Collator('vi')`.
Never `ORDER BY` a name column for display.

**Integrity queries** (run after migration and on demand; all returned 0 on the migrated DB):
`I1` orphan parentage · `I2` ancestor cycle · `I3` union with 0 partners · `I4` union with 1 partner ·
`I5` union with >2 partners · `I6` `is_living=1` with a `DEATH` fact · `I6b` `status='MARRIED'` with
a deceased partner (⇒ suggest `WIDOWED`) · `I7` death before birth · `I8` duplicate `sibling_order`
under one parent · `I9` anchor count ≠ 1 · `I10` `parentages.union_id` whose parent is not a partner
of that union · `I11` nameless person. Plus `PRAGMA foreign_key_check` (0 violations) and
`PRAGMA integrity_check` (`ok`).

### Write / persist strategy

Constraints handed down and not re-derived here: Drive `If-Match`/etag preconditions could **not**
be confirmed on `files.update`, so no optimistic-concurrency design; a browser-only public OAuth
client cannot hold a refresh token, so **no background sync**; there is currently no export path
anywhere in the codebase and `navigator.storage.persist()` is never called.

1. **One transaction per user intent, one persist at the end.** `withTransaction(fn)` wrapping
   `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK`, exported bytes written **once**. Today "add a spouse"
   is 3 separate writes and 3 full `db.export()`s (`client.ts:86`), and `QuickAddForm.tsx:76-129`
   can persist a person without its relationship.
2. **Serialise persistence through a single-slot queue keyed on snapshot recency.** Verified defect:
   `client.ts:85-94` takes the snapshot at `:86` but opens IndexedDB at `:87`, so commit order
   follows connection-open timing and an overlapping save can commit a **stale** full export last.
   The queue must compare a monotonically increasing write sequence and drop superseded snapshots.
3. **Whole-file snapshot is the durability unit** (D2: no change journal, no event sourcing). Full
   `db.export()` per intent is acceptable at this size; it is the *3-per-click* that is not.
4. **Distinguish "absent" from "failed" when reading IndexedDB.** `client.ts:80-82` returns `null`
   on any exception and `:40-42` then persists a fresh empty DB over recoverable data. Read errors
   must propagate to a retry/recovery screen; a new DB is created only when the store is confirmed
   empty.
5. **Drive: never overwrite in place.** Each push creates a new file/revision; a divergence produces
   an immutable conflict copy, never a clobber. Sync is **user-initiated** (or in-session
   opportunistic), with retained last-N snapshots.
6. **Local export is a first-class feature, not a nicety.** iOS WebKit evicts unused site data after
   7 days and nothing today mitigates it. Call `navigator.storage.persist()`, and provide a
   download-file export that the migration also reuses as its mandatory backup.
7. **Parameterised writes with a fixed column allowlist.** `escapeSql` value-quoting is not
   exploitable, but `updatePerson` interpolates caller-supplied **column names**
   (`persons.ts:102-108`), which is exactly the untrusted path for CSV/GEDCOM import. Use sql.js
   parameter binding and validate keys against a hardcoded column list; early-return on an empty
   patch (verified today: `updatePerson(id, {})` → `near ",": syntax error`).
8. **No runtime-fetching dependency.** Privacy posture is verified clean (no analytics, no CDN,
   self-hosted font and wasm, zero external URLs in `src/`). The lunar↔solar library must be
   **bundled and offline**, version-pinned, with tests on boundary years and leap months (D4).

---

## 4 · Privacy & sensitive fields

**National ID (CCCD).** Recommendation: **do not store the number at all.** Use the card scan as a
*transient* input to fill `family_name`/`middle_name`/`given_name`/birth date/address, then discard
the scan and the number. Rationale, not moralising: the number adds no genealogical value (it
identifies a living citizen to the state, it does not establish descent), while a gia phả file is
exactly the shape of record that makes a whole clan re-identifiable — and the FB threads show users
already fear this ("*pub web thì lộ hết tên cả gia tộc, rồi lũ trẻ sao dám đi học*",
"*database có gửi về server không đó*"). The file is also designed to be exported and shared, so a
stored ID number leaves the user's control the first time they hand the file to a relative.
No `national_id` column exists in this schema; adding one later is additive if the user decides
otherwise.

Sensitive columns, flagged for the export/share UI (each should be individually excludable from any
shared or printed output): `phone`, `email`, `address`, `address_lat`, `address_lng`, `fb_url`,
`zalo_url`, `avatar_url`, `biography`, `notes`, and `date_facts.BIRTH` for **living** persons
(full birth date + full name is the standard identity-verification pair). `burial_place` and
`burial_lat/lng` concern the deceased and are normally the point of sharing.

---

## Deliberately Excluded

- **`unions.end_reason`** (listed in D3). `status` already carries `DIVORCED`/`WIDOWED`/`SEPARATED`,
  so `end_reason` would duplicate it and permit contradictions (`status=DIVORCED, end_reason=DEATH`).
  Trade-off if you want it back: it would let the file record "the union ended, reason unknown" as
  distinct from `status='UNKNOWN'`. One nullable column, additive, no migration. Flagged rather than
  silently dropped because D3 is user-approved.
- **`unions.kind = 'CONCUBINAGE'`** (thứ thất). `MARRIAGE` + `partner_seq` covers ordering
  structurally and `PARTNERSHIP` covers unmarried cohabitation; "thứ thất" as GIAPHAX stores it is a
  display string. If the distinction is genuinely structural for this family, it is a one-value enum
  extension — additive.
- **`external_ref` (GEDCOM xref).** GEDCOM I/O is not in the v1 scope the brief defines, and the
  column is only needed for *idempotent re-import*. Additive when GEDCOM lands.
- **`is_demo` flag.** `seedDemoData`'s destructiveness (F-4) and its `window.__giapha` exposure in
  production builds are code defects — a `NODE_ENV` guard, a confirmation token and a transaction
  fix them without a schema column.
- **`generation` / `chi` / `nhánh` columns.** See §1.8 — a forest with cyclic pedigrees has no
  single correct value.
- **`can_chi_year` cache column.** Derivable from `year` + `calendar`; a cache that can contradict
  its source.
- **`tree_id` / multi-tree.** One file per gia phả matches D1/D2 and the local-first file model;
  merging a spouse's gia phả is import, not a column. Additive later.
- **A `migration_notes` table.** The review list is `app_settings['migration_report']` (JSON, read
  once) plus queryable domain state (`parentages.union_id IS NULL AND confidence='UNCERTAIN'`).
- **Change journal / oplog / tombstones / CRDT.** Cut by D2.

---

## Codex reconciliation

Independent adversarial run: `codex exec` given a self-contained description of the DDL, the
migration and the engine spec, asked for (A) an unrepresentable VN case, (B) a lossy migration step,
(C) a wrong kinship answer. Three findings; all three investigated, two folded in.

| # | Codex finding | Verdict | Evidence |
|---|---|---|---|
| A | **con thừa tự**: An adopts brother Bình's son Cường to continue An's heirless branch. Both `BIOLOGICAL` (Bình) and `ADOPTIVE` (An) edges exist, but nothing marks An's edge as *lineage-defining*, so chi/nhánh derivation puts Cường in Bình's branch or in both | **AGREE — folded in** | Real defect. `kind` cannot express it (both edges are legitimate) and the default "follow the biological father" is wrong for thừa tự. Added `parentages.is_lineage INTEGER NOT NULL DEFAULT 0` + `CREATE UNIQUE INDEX ux_parentages_lineage ON parentages(child_id) WHERE is_lineage = 1`. Verified: setting it on the adoptive edge succeeds; a second `is_lineage=1` for the same child → `UNIQUE constraint failed: parentages.child_id`. It also resolves `codex-cross-review.md` §3 cases 5, 6 and 13 |
| B | Migration drops `relationships.is_primary`, losing "Lan was Hùng's primary spouse" when both his unions get `partner_seq = NULL` | **DISAGREE on the loss; mitigation folded in** | The scenario is not producible. `createRelationship` defaults `isPrimary = false` (`persons.ts:125`) and **no call site passes a 4th argument** — `QuickAddForm.tsx:93,101,108,113` all use the 3-arg form. `seedDemoData`'s helper defaults `primary = 1` for *every* row (`persons.ts:217`), so in real files the value means "created by the seeder", not "vợ cả". Nothing reads it (0 UI usages). So there is no vợ-cả information to lose. Mitigation anyway, for hand-edited files: repair step R9 records every `is_primary=1` spouse row into the migration report (5 items in the validation run) instead of discarding it silently |
| C | "Blood before affinal" + dedup answers married first cousins wrongly: the union path says `vợ`, the longer blood path says `chị họ`, and blood-first picks `chị họ` | **AGREE — folded in, and it exposed a second defect** | Confirmed by running the BFS: for `chaua → chaub` the ranking as originally written prefers a blood path. Two changes: (1) ranking is now **shortest length first**, blood-before-affinal only as an equal-length tie-break — verified `chaua→chaub` = `SPOUSE` len 1 ⇒ **vợ**, while `giap→chaub` = blood len 2 ⇒ **cháu**, both correct; (2) the same run revealed that unconstrained BFS returns `chaua -CHILD-> chit -PARENT-> chaub` (len 2, labelled "pure blood") — a DOWN-then-UP pseudo-path meaning "the other parent of my child". Fixed by the **canonical path shape** `[SPOUSE?] PARENT* CHILD* [SPOUSE?]`, max one affinal step, verified to eliminate every such artefact while keeping `em vợ` (affinal@start) and `cháu dâu` (affinal@end) reachable |

Codex missed, found only here: the DOWN-then-UP pseudo-path class (surfaced while testing its own
finding C); the `count(*)` vs `count(DISTINCT child_id)` double-count in the per-union children
query; the `pragma_table_info` downgrade hazard and the fact that **no generated-column shim can fix
it** (verified: generated columns, VIRTUAL or STORED, never appear in `table_info`, only in
`table_xinfo`); ghost unions surviving partner deletion; and the Vietnamese `BINARY` collation
defect.

---

## Unresolved Questions

1. **`kinship_region` default.** The migration writes `'BAC'`. That is a *default, not an
   assertion* — largest population and best-documented term set — but it will produce Bắc terms for
   a Trung/Nam family until they change it. Confirm: ship a mandatory first-run region picker, or
   accept `'BAC'` silently?
2. **Leap-month giỗ policy.** `leap_month_memorial_policy` is written as `'ASK'` per D4 (software
   must not choose). Needs the actual UI decision: when a giỗ recorded in tháng 4 **nhuận** falls in
   a year with no leap month, does the app offer {regular tháng 4, skip, nearest} once and remember,
   or ask every year?
3. **Which lunar↔solar library, and its supported range.** Must be bundled, offline,
   version-pinned. Outside its range the app shows the stored lunar date and says conversion is
   unavailable (D4). The chosen range bounds how far back "upcoming ngày giỗ" can work.
4. **`OTHER` / `UNKNOWN` gender vs GEDCOM `SEX`.** GEDCOM 5.5.1 accepts `M`/`F`/`U`/`X`. Mapping
   is unconstrained until GEDCOM is in scope; recorded so the enum is not re-litigated then.
5. **Cousin-seniority default.** `cousin_seniority_policy = 'PARENT_RANK_THEN_BIRTH'` implements D6.
   Confirm the fallback when parent ranks tie: `RANK_TIE` (refuse) vs fall through to age. Current
   spec refuses.
6. **No test runner exists** (`package.json` has none). Every claim in this document was verified
   against scratch SQLite databases and the shipped wasm, not against project tests. A minimal
   `node:test` + `sql.js` suite covering the DDL constraints, the migration chain and the path-shape
   ranking should land **before** the DDL is implemented.
