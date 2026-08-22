# Codex Cross-Review — phản biện research 5 link FB
Chạy: `codex exec` (codex-cli 0.149.0), 7 câu hỏi chất vấn, 2026-08-21.
LƯU Ý: output bị cắt đầu do `tail -180` — mất header mục 1 và vài dòng đầu bảng "overclaimed". Phần còn lại nguyên vẹn.

| `link2-giapha-os.md § Đối chiếu dự án ta` | No backend makes Gia Phả “immune” to hosting expiry, lockout, setup friction and privacy concerns | It removes a central application database, but Google OAuth/Drive remain cloud dependencies. A local PWA can also lose data through browser-storage eviction, clearing site data, device loss, failed migration, or sync conflict. |
| `link2-giapha-os.md § Pain points` | A single lunar-calendar comment establishes a universal storage decision | It strongly supports preserving lunar input, but does not prove every family records every death or observance in lunar time. The correct invariant is “preserve the calendar and value originally asserted,” not “all death dates are lunar.” |
| `link3-ancestortree.md § Số liệu thị trường` | “54 major surnames” and “10,000+ family councils” are suitable positioning facts | No source or definition is supplied. “Major surname” and “family council” are especially elastic categories. Do not repeat these numbers publicly without verification. |
| `link3-ancestortree.md § Comment quan trọng nhất` | AncestorTree was “forced to pivot” and this is the strongest direct validation of local-first | One 23-like comment and an author response establish pressure and a feature response. They do not establish that most users rejected cloud, that the architecture truly became local-first, or that local/desktop adoption followed. |
| `link4-kintree-app.md § Mô hình kinh doanh` | KinTree is the only paid store competitor | Nothing quoted establishes exclusivity. The other notes themselves name Family Tree 11, Mac Family Tree and MyFamilyTree. |
| `link4-kintree-app.md § Mô hình kinh doanh` | KinTree sells “exactly” what Gia Phả gives away | Gia Phả’s Drive sync is planned, not shipped. KinTree’s cloud capability may include collaboration and managed recovery, which is not equivalent to synchronizing one SQLite blob. |
| `link4-kintree-app.md § Mô hình kinh doanh` | Cloud backup has proven willingness-to-pay | A premium offer is not evidence of purchases. No subscriber count, conversion rate, renewal rate, or revenue is quoted. |
| `link4-kintree-app.md § Header/traction` | App-store software spreads less than open source | These are different posts, audiences, dates and pitches. Raw Facebook engagement cannot isolate distribution-channel effects. |
| `link5-kintree-launch.md § Thuật toán vai vế` | `birth_order` must be a field on every person | What is required is an explicit, parent-contextual sibling order. A single person-level field fails for half-siblings, adoption, blended households and disputed order. The ordering belongs to a parentage/sibling group or must support an override. |
| `link5-kintree-launch.md § Thuật toán vai vế` | “Only use birth year for people sharing both parents” | Too rigid. Families may use age among cousins when branch precedence is unknown or culturally ignored; twins need another convention; half-siblings may still be ordered by age. This must be a policy with explicit overrides. |

# 2. Underweighted recurring pain point

The notes underweight **long-term, collaborative stewardship of trustworthy data**.

The repeated problem is not merely drawing the tree. It is getting several relatives to contribute, correcting mistakes safely, knowing who changed what, recovering from damage, and moving the data elsewhere:

- Admin/member proposals, audit log and backup: `link1-gia-pha-dien-tu.md § Feature set`
- Desktop bulk entry, mobile correction, GEDCOM/CSV portability: `link2-giapha-os.md § Pain points`
- Android collaboration missing and no undo: `link4-kintree-app.md § Bug / hạn chế`
- Crashes, disappearing branches, stale UI and “one person alone is not really a genealogy”: `link5-kintree-launch.md § Bug người dùng báo`; `§ Kinh doanh & rào cản chuyển đổi`

The notes scatter these under “bugs” and “features.” Collectively they are the core trust problem. A family will tolerate an imperfect kinship label temporarily. It will abandon an app that loses ten years of family records or creates two conflicting copies.

This also exposes the main tension in the locked vision: a single Google Drive SQLite blob is backup/synchronization, not safe concurrent collaboration.

# 3. Where the recursive-seniority rule breaks down

The recursive rule is useful only after the system knows which ancestral path to compare and has a total ordering at the first divergence. It is propagation logic, not a complete kinship algorithm.

| Concrete case | Why ambiguous | Extra data required |
|---|---|---|
| Mother and dì are twins | Parent seniority cannot be derived from year—or possibly date—of birth. | Explicit sibling rank or `same_rank`; family override. |
| Mother and dì have unknown birth dates | The cited situation itself becomes unresolvable without an ordering base case. | Parent-contextual `sibling_order`, confidence and source. |
| Half-siblings sharing only ông or bà | “Order among children” may differ depending on whether the family orders all children globally or separately by each marriage. | Parentage, associated union, order policy and explicit rank. |
| Children from concurrent wives | Two children may have the same father but belong to different maternal households. Birth order may mean chronological order, order within each wife’s children, or branch precedence. | Union identity, both biological parents, child order within union, optional global paternal order. |
| Adopted child raised as eldest | Biological chronology and social seniority can disagree. | Biological versus adoptive parentage, adoption date/type, social sibling rank. |
| Con riêng becomes part of a remarried household | The child may be called anh/chị/em socially without acquiring the same genealogical branch position. | Step-parent relation, household membership, effective dates, family-declared seniority. |
| Two parents have equal or disputed rank | The recursion reaches a tie and provides no tie-breaker for their children. | Cousin age policy, explicit pairwise/group order, or “ambiguous” result. |
| A 60-year-old cháu and a 35-year-old chú | Generational role overrides age; this is not an ordinary cousin-seniority comparison. | Generation distance and exact blood path before any seniority calculation. |
| Bác/chú/cô versus cậu/dì | Parent order alone cannot choose the term. The side of the family and relative’s gender matter. | Paternal/maternal path, sex/gender relevant to terminology, regional vocabulary profile. |
| Spouse of an older or younger sibling | “Chị dâu/em dâu/anh rể/em rể” derives from the blood sibling’s rank, not the spouse’s age or parents. | Union, spouse identity and the blood sibling’s contextual order. |
| `Cháu dâu` at arbitrary depth | The label is derived through both descent and marriage. A static “con dâu” edge cannot propagate it correctly. | Typed path containing descent edges and the terminal union edge. |
| Cousin marries cousin within the clan | The same person is reachable through two blood paths plus an affinal path and may have multiple valid labels. | Unique person identity, all paths, path-ranking policy, display context and manual preferred label. |
| Different chi/nhánh conventions | Formal branch precedence may follow the eldest ancestral line even when immediate parents’ ages suggest something else. | Stable child order at every ancestral divergence and explicit chi/nhánh policy. |
| Regional or household usage differs | Some families use branch precedence; others pragmatically call older cousins anh/chị. | Region is insufficient by itself; provide a family-level rule and pairwise override. |
| Records conflict | Two contributors may disagree about who was older or which marriage a child belonged to. | Provenance, confidence, conflict state and authoritative-editor resolution. |

The engine should therefore return more than a string: relationship path, computed label, confidence, rule used, and whether an override or missing fact affected it.

# 4. Data model: make union first-class

A generic person-to-person edge list is theoretically capable of representing anything if edges can carry arbitrary attributes and share a group ID. At that point, however, the group ID is already an unnamed union entity.

The current planned “persons + relationships” model is not adequate as described (`.plan/plan.md § v0.1`; `§ Plan`).

Concrete failures:

- `SPOUSE` cannot distinguish a current marriage, divorce, widowhood or concurrent marriage without dates and status. A spouse who died is not an `EX_SPOUSE`.
- Two parent edges can identify a child’s father and mother, but cannot reliably say those two people formed the relevant union—especially with remarriage, unknown parents or disputed parentage.
- With three wives, “child of the father” does not answer “child from which marriage.”
- Adoption by both spouses versus adoption by only one spouse cannot be inferred from a spouse pair.
- Polyandry creates the same problem in reverse; gender-based assumptions will corrupt the graph.
- “Con dâu,” “con rể” and “cháu dâu” are derived paths, not intrinsic person types. Storing them as direct labels produces depth bugs like the one reported in `link2-giapha-os.md § Pain points`.
- Consanguineous marriage turns the structure into a cyclic pedigree graph. Duplicating a person to keep the renderer tree-shaped creates conflicting biographies and breaks kinship calculation.

Recommendation:

```text
persons
unions
  id, kind, status, start/end date, end_reason, notes

union_partners
  union_id, person_id, role/order

parentages
  child_id, parent_id, union_id nullable
  kind = biological | adoptive | step | guardian | claimed
  effective dates, confidence, source

relationship_overrides
  subject_id, object_id, preferred_label, reason
```

Model polygamy/polyandry as multiple possibly overlapping dyadic unions, not one giant spouse group. Keep the schema capable of multiple partners only if real product requirements demand group unions.

Render a selected spanning tree for readability, but retain cross-links and deduplicate by `person_id`. Never clone the person merely because two paths reach them.

# 5. Lunar dates

Defend the intent; reject the absolute formulation in `link2-giapha-os.md § Pain points`.

The source of truth should be **the date as asserted by the family, together with its calendar**. If a relative says “mất ngày 12 tháng 7 âm,” store that lunar value. If a death certificate supplies a Gregorian date, store that Gregorian source rather than converting it and pretending the lunar result was original.

Also separate two facts:

- Actual date of death
- Recurring ngày giỗ observed by the family

They may use different calendars or the family may deliberately observe on a shifted day.

Minimum representation:

```text
calendar: vietnamese_lunar | gregorian | unknown
year, month, day
is_leap_month
precision: exact | month_only | year_only | approximate
timezone/calendar_convention
source, confidence
```

Leap months make `month=4` insufficient: regular tháng tư and tháng tư nhuận are different dates. An annual giỗ originally occurring in a leap month also needs a family policy for years without that leap month. The software must not invent one silently.

Conversion implications:

- Solar conversion requires the lunar year, leap-month flag and calendar convention.
- Recurring reminders must be recalculated for each target Gregorian year.
- Bundle a tested offline conversion library or bounded conversion table; local-first rules out depending on a network service.
- Pin the library/version and test boundary years and leap months.
- Cache derived dates if useful, but do not treat the cache as canonical.
- Outside the supported conversion range, show the preserved lunar date and say conversion is unavailable. Guessing is worse than omission.

So: lunar-as-entered is canonical; “lunar is always canonical” is wrong.

# 6. Top eight, in order

1. **Correct canonical graph model and migrations.** Add union, typed parentage, contextual sibling order, stable IDs and cycle-safe traversal before more data accumulates.

2. **Data durability.** Transactional autosave, upgrade-safe migrations, undo, snapshots, restore verification and explicit protection against browser-storage loss. No silent database reset.

3. **Fast entry and correction.** Desktop-first bulk entry, keyboard flow, search, duplicate detection, clear parent/union selection and easy reassignment. Mobile should excel at lookup and small corrections.

4. **A tree that remains usable and truthful.** Stable generation alignment, collapse/expand, ancestor/descendant views, anchor switching, long-name handling and several hundred-person performance. Never hide a branch without explaining why.

5. **Kinship computation with uncertainty.** Viewer-relative paths, paternal/maternal distinctions, contextual sibling order, regional/family rules, in-law propagation and manual overrides. Return “cannot determine” instead of guessing.

6. **Ngày giỗ done correctly.** Calendar-aware death and observance dates, leap-month support, offline conversion and a simple upcoming-anniversaries view. Build this before tử vi or “ngày tốt/xấu.”

7. **Portable backup and interchange.** Lossless native JSON/SQLite export-import first; GEDCOM where mappings are honest; optional Google Drive backup/sync only with versioning, conflict detection and restore. Do not market blob sync as collaboration.

8. **Useful family output.** Printable text/book format plus restrained PNG/PDF tree export, followed by PWA/offline/mobile/accessibility hardening for Tết lookup.

This reverses parts of `.plan/plan.md § Version Roadmap`: durability, migration and installable offline behavior are foundation work, not “v1.0 polish” after smart labels.

Explicitly do not build now:

- Social feed or “family social network”
- Live multi-user editing
- AI chatbot/agent
- OCR of old genealogy books
- Face recognition or VNeID scanning
- Tử vi, ngày tốt/xấu or 76 prayer texts
- Cross-family matching or nationwide genealogy database
- Photos/video gallery or CDN
- Google Maps/mộ navigation
- Scholarships, family funds, hương ước or ceremony task assignment
- Google Calendar integration
- Fine-grained admin/member workflow and audit UI

These are all distractions until users can safely enter, understand, back up and print a correct tree.

# 7. Missing competitive and market risk

The research mistakes **Facebook engagement inside developer communities for durable product demand**.

These posts cluster around Tết, many are AI-assisted hobby launches, and several comments come from developers discussing architecture or proposing exotic features. Reactions and shares do not establish that a clan entered 300 real people, returned after Tết, trusted the software, or paid.

The harsher interpretation of “one month, ten genealogy apps” is not “huge market waiting for the right implementation.” It may mean:

- The product is easy to demo and hard to maintain.
- Demand is sharply seasonal and usage frequency is extremely low.
- Users expect lifetime preservation but generate little recurring revenue.
- Every clan already has a substitute: paper, Word/Excel, a Zalo/Facebook group and one trusted keeper.
- Switching requires entering sensitive data about hundreds of people before value appears.
- Local-first reduces central-server risk but makes shared authority, multi-device consistency and succession after the keeper dies harder.
- A solo developer becomes another preservation risk: the app itself may disappear long before the genealogy should.

The real competitor is not KinTree. It is the existing trusted custodian plus “good enough” documents and messaging groups. The real moat is credible long-term preservation and portable ownership—not feature count, AI, or another attractive canvas.

[exited with code 0]
