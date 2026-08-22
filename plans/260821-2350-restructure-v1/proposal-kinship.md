# Spec: engine xưng hô / vai vế

> Tách ra từ thiết kế data model v2. Bảng biểu và tên field tham chiếu [data-model.md](data-model.md).
> Luật domain và bằng chứng người dùng: [culture-vietnam.md](culture-vietnam.md) §5.
> 14 case nhập nhằng gốc: `plans/reports/fb-research/codex-cross-review.md` §3.
>
> Đây là tính năng được đòi nhiều thứ hai sau đa thê, và **không đối thủ nào giải xong**.
> Comment top 58 like đòi nó; tác giả giapha-os trả lời *"em chưa nghĩ ra cách giải quyết"*;
> KinTree có làm nhưng dùng tuổi nên **sai** (xem culture-vietnam.md §5.1).

## Tổng quan

## 1 · Return contract

```ts
type KinshipResult =
  | { status: "OK";                path: Step[]; label_vi: string; label_en: string;
      confidence: "CERTAIN" | "ASSERTED" | "UNCERTAIN";
      rule_used: RuleId; override?: { reason: string }; alternatives?: Step[][] }
  | { status: "OVERRIDE";          path: Step[] | null; label_vi: string; label_en?: string;
      confidence: "CERTAIN"; rule_used: "MANUAL_OVERRIDE"; override: { reason: string } }
  | { status: "NO_PATH";           path: null; reason: "DISCONNECTED_COMPONENT" }
  | { status: "CANNOT_DETERMINE";  path: Step[]; missing: MissingFact[]; rule_used: RuleId };

type Step = { to: string; edge: "PARENT" | "CHILD" | "SPOUSE";
              via_parentage_kind?: ParentageKind; via_union_status?: UnionStatus };
type MissingFact =
  | { kind: "GENDER";        person_id: string }
  | { kind: "SIBLING_ORDER"; parent_id: string; children: string[] }
  | { kind: "BIRTH_DATE";    person_ids: string[] }
  | { kind: "UNION_LINK";    child_id: string }
  | { kind: "RANK_TIE";      a: string; b: string }
  | { kind: "NO_TERM";       note: string };
```

`NO_PATH` and `CANNOT_DETERMINE` are **different answers**. `NO_PATH` is legitimate and common —
the real clan data is a ~50-root forest, so two members frequently have no connecting path at all;
the UI says "chưa có liên hệ trong gia phả", not "không xác định được". `CANNOT_DETERMINE` means a
path exists but the term is not decidable, and `missing` tells the UI exactly which field to ask
for. Never guess (D6).

## 2 · Algorithm

**Edge set** (built once per data load, from 2 indexed queries, memoised):

| Edge | Source | Index |
|---|---|---|
| `PARENT` (up) | `parentages(child_id → parent_id)` | `sqlite_autoindex_parentages_1` (covering) |
| `CHILD` (down) | `parentages(parent_id → child_id)` | `idx_parentages_parent` |
| `SPOUSE` | `union_partners` self-join on `union_id` | `ux_union_partners_seq (person_id=?)` |

**Canonical path shape.** A valid kinship path is exactly:

```
[SPOUSE?]  PARENT*  CHILD*  [SPOUSE?]        with AT MOST ONE spouse step in total
```

This constraint is load-bearing, and it was added because the Codex review found the naive version
wrong. Unconstrained BFS returns garbage: for the two married first cousins it produced
`chaua -CHILD-> chit -PARENT-> chaub` — length 2, "pure blood" — which is really "the other parent
of my child", i.e. a DOWN-then-UP pseudo-path with no kinship meaning. The shape rule:

- forbids ascending after descending ⇒ no DOWN-then-UP artefacts;
- allows the affinal step only at position 0 (`SPOUSE` then blood = *my spouse's relatives*,
  bên vợ/bên chồng) or at the end (blood then `SPOUSE` = *the spouse of my relative*: con dâu,
  cháu dâu, chị dâu, anh rể);
- caps affinal steps at one, so in-law-of-an-in-law correctly yields `CANNOT_DETERMINE`
  (`NO_TERM`) — Vietnamese has no single word for it.

Both affinal positions are required by real cases: `em vợ` is `SPOUSE` + UP¹ + DOWN¹, and the
link5 rule "*khi lấy vợ thì nhà vợ có em dù có hơn tuổi chồng cũng sẽ vẫn là em vợ*" is exactly
"compute the blood term from the spouse's viewpoint, then suffix vợ/chồng".

**Search.** Bidirectional BFS from subject and object over the shape-constrained state machine
(state = `{node, phase ∈ UP|DOWN, affinal_used, affinal_pos, terminated}`), depth-bounded
(default 7 edges each side), visited-set keyed on `(person_id, phase, affinal_used)`. Collect all
minimal-length paths, plus one longer band for `alternatives`.

**Path ranking** (first rule that discriminates wins):

1. explicit `relationship_overrides(subject, object)` → return `OVERRIDE`, skip everything;
2. **shortest total length**;
3. fewer affinal steps (blood before affinal) — at equal length only;
4. `is_lineage=1` edges, then `BIOLOGICAL`, then `ADOPTIVE`/`STEP`, then `GUARDIAN`/`CLAIMED`;
5. lexicographic `person_id` sequence, purely so the answer is stable across renders.

Rule 2 before rule 3 is the Codex fix. Verified on the migrated hard case:

| pair | competing shape-valid paths | picked | term |
|---|---|---|---|
| chaua → chaub (married first cousins) | `SPOUSE` len 1 · blood UP²DOWN² len 4 | len 1 | **vợ** ✓ |
| giap → chaub (granddaughter who married a grandson) | blood UP⁰DOWN² len 2 · affinal len 3 | len 2 | **cháu** ✓ |
| chit → chaub | blood UP¹ len 1 · affinal@end len 2 | len 1 | **mẹ** ✓ |
| giap → vom | affinal@end UP⁰DOWN¹+SPOUSE len 2 | len 2 | **con dâu** ✓ |
| chit → giap | two blood UP³ paths, both len 3 | tie, same label | **cụ** (rule 5 for stability) |

**Seniority recursion** (D6). To decide anh/chị vs em between two people whose paths diverge at a
common ancestor A:

```
rank(x, y):
  if x and y are full siblings (same parent set):
     compare parentages.sibling_order under the shared parent; if either is NULL,
     compare BIRTH date_facts; if either is missing -> RANK_TIE
  else:
     let px = the child of A on x's path, py = the child of A on y's path
     r = rank(px, py)                    # recurse on the PARENTS, not on ages
     if r is decided -> x inherits it    # con của dì = em họ because dì is em of mẹ
     else -> apply cousin_seniority_policy, else RANK_TIE
```

Termination: each recursive step moves one generation closer to A, and A is finite because the
cycle triggers guarantee the parentage graph is a DAG. Base case = the divergence at A.
**Generation distance is compared before seniority ever runs**: a 60-year-old cháu is cháu to a
35-year-old chú, because up-steps ≠ down-steps means it is not a same-generation comparison at all.
Age is consulted only inside the full-sibling base case, and only when `cousin_seniority_policy`
permits.

## 3 · 14 case nhập nhằng

Nguồn: `plans/reports/fb-research/codex-cross-review.md` §3.

| # | Case | Engine returns | Field that resolves it |
|---|---|---|---|
| 1 | mẹ and dì are twins | `CANNOT_DETERMINE` `RANK_TIE(mẹ, dì)` | equal `parentages.sibling_order` is *representable* (ties allowed) → then `relationship_overrides` |
| 2 | birth dates of mẹ and dì both unknown | `CANNOT_DETERMINE` `SIBLING_ORDER(ông ngoại,[mẹ,dì])` | `parentages.sibling_order` typed in by hand |
| 3 | half-siblings sharing only ông or bà | `OK`, ranked within the asked parent's own children | `sibling_order` is per-parentage, so the father's row and the mother's row carry different numbers |
| 4 | children of concurrent wives | `OK` | `parentages.union_id` + `union_partners.partner_seq`; global paternal order = father's `sibling_order`, order within a wife = same field filtered by `union_id` |
| 5 | adopted child raised as eldest | `OK` with `rule_used=SOCIAL_ORDER` | `sibling_order=1` on the `ADOPTIVE` row while `kind` still records the adoption; `is_lineage` if he also inherits the branch |
| 6 | con riêng entering a blended household | `OK`, socially anh/chị/em; branch unchanged | `kind='STEP'` + `effective_from_year`; `is_lineage=0` keeps him in his own chi |
| 7 | two parents equal or disputed rank | `CANNOT_DETERMINE` `RANK_TIE` | `cousin_seniority_policy`, else `relationship_overrides` |
| 8 | 60-year-old cháu vs 35-year-old chú | `OK`, generation wins | up/down step counts on the path; age never enters |
| 9 | bác/chú/cô vs cậu/dì | `OK`, or `CANNOT_DETERMINE` `GENDER(p)` | gender of the **linking parent** (paternal vs maternal side) + gender of the relative; `gender='UNKNOWN'` ⇒ refuse rather than guess |
| 10 | chị dâu / em dâu / anh rể / em rể | `OK` | rank of the **blood sibling** via `sibling_order`, then the affinal@end step; the in-law's own age is never used |
| 11 | cháu dâu at arbitrary depth | `OK` | typed path: N down-steps + one affinal step; term = generation word(N) + dâu/rể from the in-married person's gender. **Verified at N=1 and N=2** |
| 12 | cousins marrying inside the clan | `OK` = **vợ/chồng**, with the blood path returned in `alternatives` | ranking rule 2 (shortest) — one `person_id`, never cloned |
| 13 | chi/nhánh precedence ≠ parents' ages | `OK` | `sibling_order` at every ancestral divergence + `is_lineage` for thừa tự |
| 14 | regional / household usage differs | `OK` under the active policy | `app_settings.kinship_region` + `cousin_seniority_policy` + per-pair `relationship_overrides` |

Case 12 also covers the extra state the traversal exposed: `p-null` is the **ex**-spouse of a
depth-1 descendant, so the term is not "con dâu" but "vợ cũ của con" — the affinal step must carry
`via_union_status` into term selection, which is why `Step` includes it.

## 4 · Side, gender, region, translation

Term selection consumes exactly: `(up_steps, down_steps, affinal_position, side, ego_rank,
target_gender, linking_parent_gender, union_status, region_profile)`. `side` (nội/ngoại) is derived
from the gender of the parent the path ascended through — not stored on the person. If any consumed
gender is `UNKNOWN`, return `CANNOT_DETERMINE` with `MissingFact{GENDER}`.

Region and family custom are a **policy object** in `app_settings`, never hardcoded strings:

```jsonc
{ "region": "BAC",
  "cousin_seniority": "PARENT_RANK_THEN_BIRTH",   // | PARENT_RANK_ONLY | AGE_FIRST
  "terms": { "father.elder_brother": "bac.m", "mother.younger_sister": "di" } }
```

Values are **term keys**, not display strings. Display strings live in the VI/EN i18n catalogue, so
a Trung/Nam profile is a different key→term mapping and English is a different catalogue over the
same keys. `relationship_overrides` stores literal display text (`preferred_label_vi/_en`) because a
family override is by definition outside the catalogue.

## 5 · Complexity and cycle safety

- Edge-map build: 2 indexed queries, O(P + G) once per load.
- Bidirectional BFS: O(b^(d/2)) with d ≤ 7 and branching b = children + parents + spouses. On the
  292-person real dataset this is a few thousand node visits — sub-millisecond.
- Ancestor / descendant walks: O(G) with a `UNION` (deduping) recursive CTE.
- **Cycle-safety guarantee, two independent layers:** (1) `parentages` cannot contain a cycle —
  the triggers reject self-parent, 2-cycles, 3-cycles and cycle-forming UPDATEs, verified in the
  shipped wasm; (2) every traversal is additionally depth-bounded and keeps a visited set, and every
  recursive CTE uses `UNION` not `UNION ALL`, so even a hand-corrupted file terminates. The
  migration's cycle-breaking pass (`plans/260821-2350-restructure-v1/migration.md` §3) is what makes layer (1) achievable on
  existing files.

---

