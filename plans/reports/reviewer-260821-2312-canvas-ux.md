# Reviewer — Tree Canvas Rendering & UX (v0.5 WIP)

Date: 2026-08-21 · Scope: read-only review, no files modified except this report.
Files reviewed: `src/components/FamilyTreeCanvas.tsx` (446), `PersonCard.tsx` (205), `QuickAddForm.tsx` (358), `OnboardingScreen.tsx` (205), `SidePanel.tsx` (161), `PhoneInput.tsx` (34), `src/components/ui/*`, `src/app/globals.css`, `src/app/page.tsx`, `src/i18n/*`.
Verification run: `tsc --noEmit` exit 0 · `next build` exit 0 · `eslint src` **6 errors** · layout algorithm re-implemented and simulated in a scratch harness (results quoted inline).

## Verdict

**BLOCK for v0.5.** Three unrelated problems each independently break the product promise:

1. The layout produces **provable card-on-card overlap in the single most common family shape** (me + 2 parents + 4 grandparents) — verified by simulation, not speculation.
2. **v0.5's headline features do not exist.** `.plan/plan.md:133-139` changelogs scroll-panning, wheel/pinch zoom and arrow-key nav as `Added`. Grep across `src/` finds zero `onWheel`, zero `keydown`, zero `scale`, zero touch handlers. `FamilyTreeCanvas.tsx:406-411` is still the v0.4 `framer-motion` `drag`. The changelog is false.
3. **"Add sibling" silently creates an orphan record** (`QuickAddForm.tsx:119-126`) — data written, no relationship, person banished to the off-screen "left behind" row.

The code reads as confident (tidy section banners, `useMemo` everywhere, `useCallback` everywhere) but the memoised functions are `O(N·R)`, nothing is `memo()`-wrapped, and the layout is a hardcoded 5-row neighbourhood of the anchor rather than a tree layout. It will look correct on the 14-person seed and fall apart on a real clan.

---

## Findings

### CRITICAL

**C1 — Grandparents overlap exactly in the most common family shape.**
`FamilyTreeCanvas.tsx:201-202, 217-238`. With no aunts/uncles recorded, `uMinX` falls back to `father.x`, so `cX = (fatherX + fatherX)/2 = fatherX`; paternal grandmother lands at `fatherX + 0.5` and maternal grandfather at `motherX - 0.5`, and `father/mother` are exactly 1.0 apart. Both resolve to the same slot.
Simulated input `an + cha + me + ông nội + bà nội + ông ngoại + bà ngoại` (no aunts/uncles):
```
an@(0,2) cha@(-0.5,1) me@(0.5,1) ongnoi@(-1,0) banoi@(0,0) ongngoai@(0,0) bangoai@(1,0)
EXACT OVERLAP: (0,0) -> banoi + ongngoai
```
Bà nội and Ông ngoại render on top of each other; which one is visible depends on `persons` order, which is `ORDER BY last_name, first_name` (`src/db/persons.ts:25`). The hidden card is unclickable — all cards share `zIndex: 10` (`FamilyTreeCanvas.tsx:434`).
Fix: stop deriving X from ad-hoc midpoints. Compute per-tier packing that reserves the horizontal width of each subtree (Reingold–Tilford / Walker style), then assert no duplicate `(x,y)` before render.

**C2 — Sibling subtrees collide; nieces/nephews stack.**
`FamilyTreeCanvas.tsx:255-259`. `sx - (n.length-1)/2 + i` centres each sibling's children on that sibling with no width reservation. Siblings are 1 column apart (`:192`), so a sibling with ≥2 children immediately invades the next sibling's band.
Simulated `anchor + 2 siblings, 4 children each`:
```
EXACT OVERLAP: (-2.5,3) sib1k1+sib2k2 | (-1.5,3) sib1k2+sib2k3 | (-0.5,3) sib1k3+sib2k4
```
3 of 8 grandchildren-tier cards are fully hidden. Same defect for grandchildren (`:262-274`).
Fix: same as C1 — subtree width reservation, applied bottom-up.

**C3 — "Add sibling" writes a person with no relationship (orphan) and reports success.**
`QuickAddForm.tsx:76-133`. `createPerson` commits at `:76`, then the `sibling` branch at `:119-126` only `console.warn`s ("not yet supported by DB schema") and `onClose()` runs at `:133`. The user sees the dialog close as if it worked. The new person then hits the fallback at `FamilyTreeCanvas.tsx:276-282` and is parked at `y: 5` — below grandchildren, off-screen, with no connector.
The (+) sibling button is live and colour-coded for this flow (`PersonCard.tsx:67-72`), so this is a first-session path, not an edge case.
Fix: either derive siblings from the target's parents (create `PARENT_OF` rows from each of the target's parents to the new person — the layout already infers siblings that way at `FamilyTreeCanvas.tsx:188-192`), or disable the button and surface a real error instead of `console.warn`. Do not commit the person before the relationship succeeds.

**C4 — Destructive dev helper shipped in the production bundle.**
`src/app/page.tsx:19-21` assigns `window.__giapha = { seed: seedDemoData }` unconditionally. `seedDemoData` begins `DELETE FROM relationships; DELETE FROM persons` (`src/db/persons.ts:162-163`) with no confirmation. `next build` includes it (build succeeded with this code present). For a local-first app where the browser holds the only copy of a family's genealogy, a globally reachable "wipe everything" is a data-loss trigger, not a convenience. Also the source of one of the 6 lint errors (`no-explicit-any`).
Fix: gate on `process.env.NODE_ENV !== "production"`, and require an explicit confirm argument.

**C5 — DB read failure is indistinguishable from an empty tree.**
`FamilyTreeCanvas.tsx:134-142`: `catch` → `console.error` only. `persons` stays `[]`, so `:372-389` renders "Cây Gia Phả trống / Add first member". A user whose sql.js load or IndexedDB read failed is invited to re-enter their family from scratch on top of data that still exists. Classic catch-and-swallow.
Fix: keep a `loadError` state, render a retry surface, and never show the empty-tree CTA when the load did not succeed.

### HIGH

**H1 — v0.5 features unimplemented but changelogged as done.**
`.plan/plan.md:100-102` (unchecked tasks) directly contradicts `.plan/plan.md:133-139` (`[0.5.0] Changed: scroll-based panning`, `Added: Zoom (wheel + pinch + buttons)`, `Added: Arrow key navigation`). Evidence: `FamilyTreeCanvas.tsx:406-411` is `motion.div drag`; grep for `onWheel|wheel|keydown|scale(|onTouch|pinch|scrollLeft` across `src/` returns only unrelated matches in `ui/button.tsx` and `ui/input.tsx`. Zoom does not exist at any level.
Fix: revert the changelog entries to WIP; do not claim a shipped feature until the handler exists.

**H2 — The anchor is not on screen at first paint; nothing can bring it back.**
The transform origin is `top-1/2 left-1/2` of the canvas (`:412`) and the anchor is placed at `y: 2` (`:184`) = `2 * ROW_H = 360px` **below** the vertical centre. On a 390×844 phone (canvas ≈ 788px tall, centre at 394) the anchor's card centre lands at ~754px — clipped by the bottom edge; children (`y:3` → +540) and grandchildren (`y:4` → +720) are entirely off-screen. What is centred on load is the grandparent row. There is no fit-to-view, no reset, no zoom-out. `drag` at `:406-409` has no `dragConstraints`, so `dragElastic={0.05}` and the bounce `dragTransition` are inert and the user can fling the tree arbitrarily far with no way back except a reload.
Fix: after layout, translate so the anchor is centred (or fit the bounding box), and add a "recenter on anchor" control. Compute constraints from the coords bounding box.

**H3 — `O(N·R)` layout and labels, recomputed on every store write, with no memoised nodes.**
`FamilyTreeCanvas.tsx:178-181` defines `getP/parentsOf/childrenOf/spousesOf` as full array scans; they are called inside `forEach` loops at `:190, 208, 212, 242, 247, 251, 258, 264, 269, 271`. `edges` re-runs two full relationship filters per person (`:293-294, 296`). `getRelationLabel` is `O(R)` per card and is called during render for every node (`:106`). At N=500 / R≈1000 that is on the order of 10⁶ predicate evaluations per render pass. Neither `NodeCell` (`:87`) nor `PersonCard` (`PersonCard.tsx:75`) is wrapped in `React.memo`, `cellProps` is a fresh object each render (`:363-370`), and every node receives three new closures (`:120-122`) plus a new `style` object (`:430-435`). Clicking any card therefore re-renders and re-labels all 500 nodes.
Fix: build adjacency `Map`s once per `relationships` change (`Map<id, string[]>`), pass a precomputed label into a `memo()`'d node, and memoise the position style.

**H4 — Whole-store subscriptions: every state change re-renders the whole tree.**
`FamilyTreeCanvas.tsx:130-131`, `page.tsx:14`, `SidePanel.tsx:11-18`, `QuickAddForm.tsx:22-32` all call `useTreeStore()` with no selector. In Zustand v5 that subscribes to the entire state object, so switching locale, opening the form, or selecting a person re-renders the 500-node canvas.
Fix: `useTreeStore((s) => s.persons)` etc., or `useShallow` for grouped reads.

**H5 — Polygamy renders wrong on both axes.**
(a) Spacing: `QuickAddForm.tsx:107-118` writes **two** `SPOUSE` rows per marriage while `spousesOf` (`:181`) already treats the relation as undirected, so `spouses` contains each wife twice and `map.set(sp, {x: i+1})` keeps the last index. Simulated `3 wives added via the (+) button + 9 children`:
```
an@(0,2) vo1@(2,2) vo2@(4,2) vo3@(6,2)
```
Wives are spaced 480px apart with an empty column between each — the spouse line runs through a visual gap. (The 14-person seed writes one row per marriage, `src/db/persons.ts:240-241`, so this never shows in the demo.)
(b) Grouping: children are laid out by insertion order centred on the hardcoded `marriageMidX = 0.5` (`:252-253`) regardless of which wife is the mother, so `vo1`'s children land at `x -3.5..-1.5` while `vo1` sits at `x 2`. Every child's horizontal connector run is drawn at the same `pY + ROW_H/2` (`:330`), so all nine runs collapse onto one horizontal line and the diagram cannot express which child belongs to which mother — the core requirement in `README.md:12`.
Fix: group children by parent-couple, allocate each couple a contiguous band, and stagger the horizontal run per couple (e.g. `pY + ROW_H/2 ± k`). Deduplicate `SPOUSE` writes (write one row; make the query direction-agnostic, as it already is).

**H6 — Marriage-line colour is non-deterministic (depends on alphabetical name order).**
`FamilyTreeCanvas.tsx:334-345` unconditionally pushes a stone-300 "bridge" between a child's parents — the comment claims it is an "invisible bridge if spouse line wasn't drawn", but it is neither invisible nor conditional. It has the same geometry as the rose-200 spouse line from `:308-312`, and `:350-357` deduplicates edges **by path string**, keeping whichever was pushed first. Push order follows `persons`, which is `ORDER BY last_name, first_name`. Simulation confirms: with a child sorting before its parents, `sp-cha-me` is dropped and the couple is drawn in stone-300; reverse the names and it is rose-200. `EX_SPOUSE` is drawn with the same colour as `SPOUSE` in both paths, so a divorce is visually identical to a marriage even though the label distinguishes it (`:34`).
Fix: one edge model with an explicit `kind` (`spouse` / `ex-spouse` / `parent` / `adopted`), dedupe by a semantic key, dashed stroke for `ex-spouse`, and delete the bridge branch.

**H7 — Anchor change: split-brain state + unhandled rejection + N store writes.**
`FamilyTreeCanvas.tsx:146-153`. (a) It never calls `setAnchorPersonId`, so `store.anchorPersonId` keeps pointing at the onboarding person; `QuickAddForm.tsx:48` uses that stale id for surname suggestions, and it is the value persisted to localStorage (`treeStore.ts:99-104`). Two sources of truth for "who is the anchor". (b) `handleSetAnchor` is `async` and passed straight to `onClick`; if `setAnchorPerson` throws (it rethrows, `src/db/persons.ts:91-93`) the rejection is unhandled and the UI silently keeps the old anchor while the user believes it changed. (c) It loops `persons` issuing one `updatePerson` per anchored row instead of a single store action.
Fix: one store action that swaps both `persons[].is_anchor` and `anchorPersonId`; `try/catch` with user-visible failure.

**H8 — `QuickAddForm` bypasses i18n entirely, and kinship labels are untranslatable.**
Every visible string in `QuickAddForm.tsx` is hardcoded Vietnamese — `:70, 135, 152-156, 181-184, 195, 203-205, 212, 219, 225, 236, 245, 259, 269, 286, 301, 306, 309, 315, 335, 345, 354` — while `vi.ts:87-117` / `en.ts:24-53` already define `t.form.*` keys for essentially all of them. In EN mode the entire add-member flow stays Vietnamese. Same in `PersonCard.tsx:51, 57, 63, 69, 122, 150, 174` (`"Thêm cha/mẹ"`, `"Nhân vật trung tâm"`, `"Đã qua đời"`, `"Đặt làm nhân vật trung tâm"`) and `:37` (`"Sinh"`), plus `SidePanel.tsx:88` which inlines a `locale === "vi" ? … : …` ternary instead of a dictionary key.
`getRelationLabel` (`FamilyTreeCanvas.tsx:16-84`) returns raw Vietnamese (`"Cha"`, `"Con trai"`, `"Bác/Chú/Cậu"`, …) with no dictionary equivalent — `Dictionary` (`vi.ts:4-61`) has no kinship section at all, so gendered kinship cannot be translated today.
Note: VI/EN **key sets are in sync** — `en.ts:4` types itself as `Dictionary`, and `tsc` exits 0, so parity is compiler-enforced. The gap is unused keys plus a missing kinship namespace.
Fix: return kinship *keys* (`father`, `elderBrother`, `paternalUncle`) from the label function, add a `kinship` section to `Dictionary`, and wire `QuickAddForm`/`PersonCard` to `t`.

**H9 — Cousins overlap siblings by 24px whenever a half-column offset meets an integer column.**
Cards are `w-36` = 144px (`PersonCard.tsx:102`) and `COL_W = 240` (`:12`), so any 0.5-column delta = 120px < 144px → overlap. Siblings get integer slots (`:192`); cousins get `uncleX - (c.length-1)/2 + i`, which is half-integer for even child counts (`:241-248`).
Simulated `anchor + 1 sibling + paternal uncle with 2 children`:
```
sib@(-1,2) ~ co2@(-1.5,2) — 120px apart, cards 144px wide
```
Card bodies overlap by 24px and the ±20px (+) buttons overlap by ~64px, making one of them unclickable.
Fix: quantise all X to a single grid whose pitch is ≥ card width + gutter, and pack rows instead of centring independently.

**H10 — Opening the side panel yanks the whole tree sideways.**
`SidePanel.tsx:32` is `sm:relative w-full sm:w-80 lg:w-96`, so on ≥sm it becomes a flex sibling and shrinks the canvas. The tree origin is `left-1/2` of the canvas (`FamilyTreeCanvas.tsx:412`), so every card jumps ~160-192px left the instant a card is selected — the card the user just clicked slides out from under the cursor, and the panel can cover it.
Fix: compensate the pan by half the panel width when it opens, or overlay the panel instead of resizing the canvas.

### MEDIUM

**M1 — Connector stems use a magic ±60px half-card-height that matches no actual card.**
`FamilyTreeCanvas.tsx:330` hardcodes `pY + 60` and `cY - 60`. Real card height varies with content: role badge (`PersonCard.tsx:111-125`, ~20px) + lifespan line (`:164-166`, ~11px) are conditional, so cards range ~85px (no badge, no years) to ~125px (both). At 85px the stem overshoots ~18px into the card; at 125px it stops ~2px short. This is exactly the "lệch đường kẻ stem và card" bug the `[0.4.1]` changelog claims to have fixed.
Fix: fixed card height (or measure once via `ResizeObserver`), exported as a named constant alongside `COL_W`/`ROW_H`.

**M2 — Tap-vs-pan conflict and dead pinch on touch.**
`FamilyTreeCanvas.tsx:406` enables two-axis `drag` on a full-bleed layer above every card. `PersonCard` only stops propagation on `click` (`PersonCard.tsx:89-92, 173, 193`), not on pointerdown, so a thumb tap with >3px of travel becomes a pan and the card never selects. framer's two-axis drag also suppresses native touch panning/pinch inside the element, so the browser's own pinch-zoom (the only zoom that exists today, since H1) is dead over the canvas.
Fix: implement the planned pointer-event pan/zoom with an explicit drag threshold and `touch-action: none` scoped deliberately; give cards `onPointerDown` guards.

**M3 — Accessibility gaps on the primary interaction surface.**
- Touch targets: add buttons are `size-7` = 28px (`PersonCard.tsx:53, 59, 65, 71`), the set-anchor star is `size-5` = 20px (`:175`). Both under the 44px guidance for a mobile-first app.
- `PersonCard.tsx:171-179`: the star is `opacity-0 group-hover:opacity-100` but remains focusable — a keyboard user focuses an invisible control. No `focus-visible:opacity-100`.
- Icon-only close buttons with no accessible name: `SidePanel.tsx:39-44`, `QuickAddForm.tsx:159-165`.
- `FamilyTreeCanvas.tsx:415` SVG has no `aria-hidden="true"`, and the tree has no `role`/label — a screen reader walks 500 unlabelled buttons with no structure.
- No `prefers-reduced-motion` anywhere (grep: 0 hits) while spring animations run on every node (`:108-113`), the panel (`SidePanel.tsx:28-31`) and onboarding (`OnboardingScreen.tsx:61-64`).
- `SidePanel` is a `motion.aside` with no `role="dialog"`, focus trap, Escape handler, focus restoration, or background inerting — on mobile it covers the entire viewport (`:32 w-full`).
- `select-none` on the canvas root (`:392`) blocks copying a phone number or name off a card.

**M4 — Contrast failures on the glassmorphism cards.**
`PersonCard.tsx:116` anchor badge: white text on `amber-400/90` ≈ **1.7:1** (needs 4.5:1). `PersonCard.tsx:165` lifespan: `text-stone-400` on white ≈ **2.5:1**, at `text-[9px]`. Also `text-[10px]` badge text (`:114`) and `text-[11px]` names (`:159`) are below comfortable minimums for the elderly users the plan explicitly targets (`.plan/03-ux-workflow.md`, OCR-for-elderly section). The non-anchor badge (`stone-700`/white ≈ 10:1) is fine.
Fix: darker amber (`amber-600`) or dark text on amber; `stone-500`+ and ≥11px for the lifespan.

**M5 — Mobile/PWA shell not viewport-safe.**
No `env(safe-area-inset-*)` anywhere (grep: 0 hits) — in iOS standalone the header sits under the notch and the panel bottom under the home indicator. `page.tsx:30` uses `min-h-screen` (`100vh`) not `100dvh`, so iOS Safari's collapsing toolbar clips the bottom row. No `overscroll-behavior: none` in `globals.css` (which contains only shadcn tokens, `:1-126`) → rubber-band/pull-to-refresh fires while panning. `SidePanel.tsx:32` uses `absolute` but its nearest ancestors (`main` `page.tsx:94`, the root div `:30`) are unpositioned, so it resolves against the initial containing block — works only because the page never scrolls.

**M6 — Relationship types silently dropped from the diagram.**
`db/types.ts:33-37` declares `ADOPTED_PARENT_OF`; `FamilyTreeCanvas.tsx` handles only `PARENT_OF` in both `coords` (`:179-180`) and `edges` (`:293`). An adopted child (`con nuôi`) gets no tier and no connector, landing in the `y:5` fallback. `EX_SPOUSE` is laid out and stroked identically to `SPOUSE` (`:181, 294, 310-311`). `README.md:12` promises exactly these distinctions.

**M7 — Avatars are raw remote `<img>` on a privacy-first app.**
`PersonCard.tsx:137-146`: `avatar_url` straight from the DB into `src`, with the lint rule disabled and no `loading="lazy"`, no `referrerPolicy`, no `onError` fallback. At 500 cards this is 500 eager requests; each one also leaks the user's IP and referrer to whatever host the URL names, which contradicts the local-first privacy premise. Broken URLs show a browser broken-image glyph inside the gradient circle.

**M8 — Sibling seniority is wrong when `birth_year` is missing.**
`FamilyTreeCanvas.tsx:47-53`: `person.birth_year ?? 9999` makes an unknown birth year the *youngest*, so a real elder sibling is labelled `Em trai`/`Em gái`; when both are unknown both are `Anh`/`Chị`. Mislabelling seniority is a social error in Vietnamese, not a cosmetic one. Also the first loop (`:24-38`) returns on the first matching relationship row, so a person who is both spouse and cousin gets whichever label the DB row order happens to yield.
Fix: return no label when the comparison is undecidable, and let the user set order explicitly.

**M9 — Lint is red and the build does not catch it.**
`eslint src` → 6 × `@typescript-eslint/no-explicit-any` (`page.tsx:20`, `db/persons.ts:28, 76, 90, 145, 209`). `next build` exits 0 because Next 16 no longer runs ESLint during build — CI that only builds will stay green forever.
Fix: add `pnpm lint` to CI; type the sql.js result shape instead of `any`.

**M10 — Dead code and unused surface.**
`src/components/ui/dialog.tsx` (158), `ui/form.tsx` (167), `ui/card.tsx` (92) are imported nowhere (grep for `ui/dialog|ui/form|ui/card`: 0 hits) — 417 lines of unused vendored UI, and the panel hand-rolls dialog behaviour instead of using the `Dialog` that is already sitting there (see M3). `src/lib/drive.ts:7-18` is three `console.log` mocks. `NodeCell`'s `delay` prop is declared and defaulted (`FamilyTreeCanvas.tsx:95, 104`) but never passed (`:437`). The `ui/*` files are otherwise unmodified stock shadcn (radix-ui unified import style) — no deviations to flag.

### LOW

- **L1** `FamilyTreeCanvas.tsx:288` comment reads `Compute SVG SVG Path Edges`; `:334-338` comment contradicts the code it documents ("invisible bridge if spouse line wasn't drawn" — it is visible and unconditional); `:52` and `:46` carry trailing whitespace. This diff also introduced stray double blank lines (`QuickAddForm.tsx:14-16`, `page.tsx:22-23`) — noise in a +562/+236 line change.
- **L2** Magic numbers with no names: `60` (`:330`), `0.5` offsets (`:201-202, 224-225, 235-236, 252`), `-5` (`:277`), `y: 5` fallback tier (`:280`), `#fecdd3`/`#d6d3d1` inline hex (`:311, 331, 343`) instead of the Tailwind tokens used everywhere else.
- **L3** `:415` SVG has no `width`/`height`/`viewBox`; it relies on `overflow-visible` to paint negative coordinates. Works in current browsers, but it also means the SVG cannot be exported as an image — a stated v0.7 goal (`.plan/plan.md:62`).
- **L4** `page.tsx:31` `sticky top-0` on the header is a no-op: no ancestor scrolls (`main` is `overflow-hidden`).
- **L5** 12 `console.*` calls remain in shipped paths (`grep -c`), including `db/persons.ts:71-75` which runs a full `SELECT * FROM persons` after **every** insert purely to log a row count.
- **L6** Uniform `zIndex: 10` on all cards (`:434`) means overlap resolution is alphabetical-by-surname; the selected/anchor card can be painted underneath a neighbour.
- **L7** Bridge edge ids are derived from X coordinates only (`:338`), so two different couples sharing an X pair on different rows would produce duplicate React keys with different paths. I could not construct it from the current tier rules, but the id is not a stable identity — use the couple's person ids.

---

## Layout Algorithm Analysis

**What it does today** (`FamilyTreeCanvas.tsx:173-285`): a single pass that writes a fixed 6-row neighbourhood around the anchor into `Map<id, {x,y}>`, with `x` in column units (`COL_W = 240`) and `y` in row units (`ROW_H = 180`), rendered as `left/top` + `translate(-50%,-50%)` (`:427-435`).

| Tier | Rule | Line |
|---|---|---|
| y=0 | Grandparents, centred between father/mother and their outermost sibling | `:216-238` |
| y=1 | Father `kidsMidX-0.5`, mother `kidsMidX+0.5`, paternal uncles left, maternal aunts right | `:194-214` |
| y=2 | Anchor `x=0`, spouses `x=i+1`, siblings `x=-(i+1)`, cousins centred on their parent | `:183-192, 240-248` |
| y=3 | Anchor's children centred on `0.5`, nieces/nephews centred on their parent | `:250-259` |
| y=4 | Grandchildren / grand-nephews centred on their parent | `:261-274` |
| y=5 | **Everyone the rules missed**, spread from `x=-5` rightwards | `:276-282` |

It is deterministic (same input → same output) and correct on the 14-person seed. It is not a tree layout: there is no traversal, no depth computation, no width reservation, and no collision check. Four independent rules write to the same `y=2` row and later `map.set` calls silently overwrite earlier ones (`:186` spouse → `:192` sibling → `:243/247` cousin → `:253` child).

**Complexity.** `getP`, `parentsOf`, `childrenOf`, `spousesOf` (`:178-181`) are linear scans, invoked inside per-person loops. `coords` is `Θ(N·R)` with an `R²` component from nested relationship-derived loops (`:190, 208, 212`); `edges` is `Θ(N·R)` (`:293-296`, two filters per person); `getRelationLabel` adds `Θ(N·R)` per render (`:24-84` called at `:106`). For a real clan at N=500 / R≈1000 that is ~10⁶ predicate evaluations per pass, repeated on every store write — and every store write re-renders because of H4. No exponential path.

**Break cases, ranked by likelihood.**

| Input | Result | Evidence |
|---|---|---|
| me + 2 parents + 4 grandparents, no aunts/uncles | Bà nội ≡ Ông ngoại, exact overlap | C1, simulated |
| 2 siblings × 4 children | 3 of 8 cards hidden | C2, simulated |
| 1 sibling + uncle with 2 children | cousin overlaps sibling by 24px | H9, simulated |
| 3 wives added via (+) | wives at x = 2, 4, 6; children not under their mother; connector runs merge | H5, simulated |
| great-grandparents (5 generations up) | fall to `y=5`, **below** the grandchildren | `:216-238` only walks 2 levels up; `:276-282` |
| great-grandchildren / cousins' children | fall to `y=5` | `:261-274` only walks 2 levels down |
| spouse of a child, sibling or cousin (con dâu/con rể) | falls to `y=5`, no spouse line drawn to their partner | `:185` only reads `spousesOf(anchor)` |
| an ex-wife's children from a prior marriage | fall to `y=5` | not in `childrenOf(anchor)` |
| disconnected sub-tree (imported branch) | every generation flattened onto `y=5`; a parent and child sit on the same row and get a backwards connector | `:277-282` + `:330` |
| a child whose two parents sit on different rows | bridge and stem both drawn at `pCoords[0].y` — the second parent's row is ignored | `:323, 342` |
| >2 recorded parents (adoptive + birth) | connector attaches to the midpoint of the two extreme parents, i.e. usually nobody | `:322` |
| adopted child (`ADOPTED_PARENT_OF`) | no tier, no edge | M6 |
| no anchor (`is_anchor` all false) | `coords` returns an empty map (`:176`) → all `persons.map` entries return `null` (`:425`) → blank canvas showing only the stats pill | `:176, 424-425` |

**Direction.** Replace the whole block with a real two-phase layout: (1) BFS generation assignment from the anchor over an adjacency index, spouses forced onto the partner's generation; (2) bottom-up subtree width reservation per generation (Walker/Reingold–Tilford), couples treated as one layout unit, children centred on their own couple's midpoint. Then assert uniqueness of `(x,y)` in dev. That is ~150 lines of pure, testable code — and it is testable precisely because the four scenarios above can be expressed as fixtures.

---

## Proposed Component Split

`FamilyTreeCanvas.tsx` (446 lines) currently owns kinship semantics, layout, edge geometry, interaction and rendering. Proposed boundaries — pure logic first, so the layout can be unit-tested against the break cases above without React:

| File | Responsibility | Moves from |
|---|---|---|
| `src/lib/tree/tree-index.ts` | Build `{parents, children, spouses}` as `Map<id, string[]>` once per `relationships` change; dedupe reciprocal SPOUSE rows here. Kills the `O(N·R)` scans. | `:178-181` |
| `src/lib/tree/layout-constants.ts` | `COL_W`, `ROW_H`, `CARD_W`, `CARD_H`, `CARD_HALF_H`, `EDGE_COLORS` | `:12-13`, magic `60`, inline hex |
| `src/lib/tree/tree-layout.ts` | `layoutTree(index, anchorId): Map<id, Point>` — generation assignment + subtree width reservation + dev-only uniqueness assert. Pure. | `:173-285` |
| `src/lib/tree/tree-edges.ts` | `buildEdges(index, coords): Edge[]` with `kind: "spouse" \| "ex-spouse" \| "parent" \| "adopted"`, stable ids from person ids, per-couple horizontal-run offset. Pure. | `:289-360` |
| `src/lib/tree/kinship-label.ts` | `getKinshipKey(person, anchor, index): KinshipKey \| null` — returns a **key**, never a display string. Pure. | `:16-84` |
| `src/components/tree/use-canvas-viewport.ts` | The actual v0.5 work: pan (pointer events), wheel/pinch zoom about the cursor, arrow-key nav, `fitToAnchor()`, constraints from the coords bbox. Single owner of the transform. | new (`:406-411` today) |
| `src/components/tree/tree-edge-layer.tsx` | `memo()` SVG with computed `viewBox`/`width`/`height`, `aria-hidden` | `:414-419` |
| `src/components/tree/tree-node-layer.tsx` | `memo()` node list + viewport culling at high N | `:421-441` |
| `src/components/tree/tree-node.tsx` | `React.memo` former `NodeCell`; receives a resolved label string, no `relationships` prop | `:87-126` |
| `src/components/tree/tree-empty-state.tsx` | Empty + load-error states (C5) | `:372-389` |
| `src/components/tree/family-tree-canvas.tsx` | Thin shell: store selectors, compose the above | remainder |

Note: existing components are PascalCase (`FamilyTreeCanvas.tsx`, `PersonCard.tsx`). The kebab-case names above follow the task brief; if the repo convention wins instead, keep PascalCase for the `.tsx` files and kebab-case for the pure `src/lib/tree/*.ts` modules. Pick one and state it — do not mix silently.

---

## Codex Cross-Review

Independent run: `codex exec --skip-git-repo-check` on the same file set, no shared context. Codex's verdict ("Production blocker. The layout is a fixed five-row neighborhood, not a scalable genealogy layout.") matches mine. Reconciliation of each distinct claim:

| # | Codex claim | Verdict | Evidence |
|---|---|---|---|
| 1 | 3 wives placed at x=1,2,3 but children centred on hardcoded `0.5`, so all children hang under wife 1's union (`:185, :252`) | **AGREE**, and worse than stated | Children are not under *any* wife — simulated: `vo1@(2,2)` with its children at `x -3.5..-1.5`. See H5. |
| 2 | QuickAdd writes each spouse twice; duplicate index yields x = 2,4,6 (`QuickAddForm.tsx:107`, `:181`) | **AGREE** | Simulation reproduces `vo1@2 vo2@4 vo3@6`. Not visible in the seed, which writes one row (`db/persons.ts:240-241`). |
| 3 | A wife also reachable as sibling/cousin/child is silently moved by later `map.set` | **AGREE** (mechanism), **UNVERIFIED** (instance) | Overwrite ordering is real (`:186 → :192 → :243 → :253`); I did not construct a family where the same person is both. Real for cousin-marriage, which is not hypothetical in Vietnamese genealogies. |
| 4 | 2 siblings × 4 children → 3 identical coordinates | **AGREE** | Simulated exactly: `(-2.5,3) (-1.5,3) (-0.5,3)`. C2. |
| 5 | Grandchild subtrees collide for the same reason (`:261`) | **AGREE** | Same missing width reservation; `:265` and `:272` both centre on the parent. |
| 6 | Anchor children and nephews can occupy the same coordinates on row 3 | **AGREE** | `:253` centres on `marriageMidX`, `:258` on `sx`; nothing prevents equality. |
| 7 | Grandparent branches overlap when there are no uncles/aunts (`:201, 224, 235`) | **AGREE — the single most important finding** | Simulated exact overlap at `(0,0)`. Promoted to C1; Codex under-rated it as one bullet among many. |
| 8 | Great-grandparents and 5th-generation ancestors fall to row 5, below all descendants | **AGREE** | `:216-238` walks exactly two levels up; fallback `:276-282`. |
| 9 | Disconnected components flattened onto row 5; parent and child can share a row and get a backwards connector | **AGREE** | `:277-282` assigns `y:5` to all; `:330` then draws `cY-60` above `pY+60`. |
| 10 | Connectors assume all parents share `pCoords[0].y` (`:319, 323, 342`) | **AGREE** | Confirmed; second parent's row is discarded. |
| 11 | >2 parents → midpoint of the extremes, not the actual couple (`:322`) | **AGREE** | Confirmed. Relevant to `ADOPTED_PARENT_OF` (M6). |
| 12 | Path-string dedup deletes *real* edges when coordinates collide (`:350`) | **DISAGREE as stated / partially UNVERIFIED** | Two colliding children of *different* parents produce different `pMid`, so paths differ and both survive (verified in the scenario-B simulation). I could not construct a dropped parent edge. What the dedup *does* drop is the genuine rose `SPOUSE` line in favour of the stone bridge, non-deterministically by name sort order — see H6, which Codex missed. |
| 13 | `coords` is `O(R² + NR)`, `edges` `Θ(NR)`, labels another `O(NR)`; ~10⁶ predicates at N=500 | **AGREE** | Matches my count. H3. |
| 14 | Only unconstrained framer drag; no wheel/pinch/zoom/arrow/reset (`:405`) | **AGREE** | Grep confirms zero handlers. H1. |
| 15 | Card gestures bubble into the drag layer; only `click` is stopped (`:406`, `PersonCard.tsx:89`) | **AGREE** | M2. |
| 16 | Anchor not guaranteed visible: 360px below the origin, no fit/centering (`:184, :412`) | **AGREE**, quantified | 390×844: anchor centre at ~754px of a 788px canvas; descendants fully off-screen. H2. |
| 17 | Five components call `useTreeStore()` with no selector | **AGREE** | `page.tsx:14`, `FamilyTreeCanvas.tsx:130`, `SidePanel.tsx:11`, `QuickAddForm.tsx:22`, plus `OnboardingScreen.tsx:17`. H4. |
| 18 | Neither `NodeCell` nor `PersonCard` memoised; `cellProps` + 3 closures + style object recreated per render | **AGREE** | `:363-370, :120-122, :430-435`. H3. |
| 19 | No virtualisation; ~10 host elements per card → ~5,000 at N=500 plus one path per edge | **AGREE** | Count matches `PersonCard.tsx:94-168`. |
| 20 | Add controls reachable "only after activating the card, then tabbing into newly mounted content"; no directional keyboard model | **AGREE with correction** | They *are* keyboard-reachable (the card is a real `<button>`, `PersonCard.tsx:96`; the add buttons mount after it in DOM order and get accessible names from `title`). The real defects are size (28px/20px) and the focusable-while-invisible star. M3. |
| 21 | 28×28 and 20×20 targets fail 44×44 guidance | **AGREE** | `PersonCard.tsx:53, 175`. M3. |
| 22 | Set-anchor button focusable while `opacity-0`, hover-only | **AGREE** | `PersonCard.tsx:171-179`. M3. |
| 23 | Panel has no dialog semantics, name, focus trap, Escape, focus restoration, inerting | **AGREE**, plus: a vendored `ui/dialog.tsx` that solves this is sitting unused | `SidePanel.tsx:26-32`; `ui/dialog.tsx` has 0 importers. M3 + M10. |
| 24 | Close buttons have no accessible name (`SidePanel.tsx:39`, `QuickAddForm.tsx:159`) | **AGREE** | Neither has `aria-label`/`title`, unlike the card buttons which do. |
| 25 | Connector SVG has no `aria-hidden`/role/title (`:415`) | **AGREE** | M3. |
| 26 | No reduced-motion condition anywhere | **AGREE** | Grep: 0 hits. M3. |
| 27 | Hardcoded Vietnamese list (canvas kinship, PersonCard, ~25 sites in QuickAddForm, SidePanel `Bản thân`) | **AGREE**, line numbers spot-checked | `SidePanel.tsx:88` is worse than "hardcoded" — it's an inline locale ternary. H8. |
| 28 | `OnboardingScreen.tsx` and `page.tsx` have no hardcoded Vietnamese UI strings | **AGREE** | Both use `t.*` throughout; `layout.tsx:8-10` metadata is VI-only, which is defensible for a VI-first app. |
| 29 | "Add sibling" persists a person, warns, and closes successfully → orphan | **AGREE — promoted to Critical** | `QuickAddForm.tsx:76, 119-126, 133`. C3. |
| 30 | Anchor state split-brain: canvas uses `is_anchor`, QuickAdd uses `anchorPersonId`, never synced | **AGREE**, plus unhandled rejection | `FamilyTreeCanvas.tsx:146-153`, `QuickAddForm.tsx:48`, `treeStore.ts:99`. H7. |
| 31 | Reciprocal SPOUSE rows are redundant by design and corrupt layout indexing and counts | **AGREE** | Also inflates the "N mối quan hệ" stat at `:400`. H5. |

Codex missed (present only in this review): C1's promotion to blocker with a reproduction, C4 (`window.__giapha` wipe in the production bundle), C5 (load failure masquerading as an empty tree), H6 (non-deterministic marriage-line colour via path-string dedup ordering), H9 (the 120px-vs-144px overlap arithmetic), H10 (panel resize yanking the canvas), M1 (±60 magic half-height vs actual card height), M4 (measured contrast ratios), M6 (`ADOPTED_PARENT_OF` dropped), M7 (remote avatar privacy/eager-load), M8 (missing `birth_year` → wrong seniority label), M9 (lint red, build green), M10 (417 lines of unused vendored UI), and the changelog-vs-reality contradiction in `.plan/plan.md`.

---

## Unresolved Questions

1. **framer `AnimatePresence` exit animations** — `FamilyTreeCanvas.tsx:422-441` gives `AnimatePresence` plain `<div>` children; the `exit` prop lives on the nested `motion.div` (`:112`). Nested motion components normally pick up presence via context, so this probably works, but I did not verify it on a device. If exit never runs, `:112` is dead code.
2. **`layoutId={person.id}` cost at scale** (`:109`) — shared-layout projection measures participating nodes when layout changes. At N=500 with every anchor change moving every card, this is a plausible reflow storm. Needs a profile before deciding whether to keep the animation.
3. **Intended polygamy semantics** — should each wife get her own child band (one union per wife), or should half-siblings share one row ordered by birth year? This is a product/cultural decision that changes the layout algorithm; I did not find it specified in `.plan/`.
4. **Is `y=5` "left behind" intentional or a stopgap?** It currently hides real modelling gaps (great-grandparents, in-laws, adopted children, disconnected imports). If the answer is "stopgap", it should be a visible "unlinked members" tray, not a silent row below the tree.
5. **Target scale for v1.0** — the review assumes 200-1000 persons per the task brief. If the real target is ≤100, H3/H4 drop to Medium and virtualisation is unnecessary; C1/C2/C3 remain blockers regardless.
6. **PWA shell ownership** — `public/` has no `manifest.json` and `layout.tsx` declares no manifest, while `README.md:8` advertises installability. Presumably rev-arch's scope; flagged so it does not fall between reviews.
