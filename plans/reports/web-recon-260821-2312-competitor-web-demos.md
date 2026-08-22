# Web Recon — Vietnamese Gia Phả Competitors (live browser evaluation)

Date: 2026-08-21/22 · Method: in-app browser (navigate / read_page / javascript_tool / read_network_requests / resize_window).
Raw measurement dump: `/private/tmp/claude-501/-Users-hangvalong-Code-projects-gia-pha/d8a96923-2c55-40c9-b8ad-7296d65492a1/scratchpad/web-recon/measurements.txt`

Screenshot note: the browser tool returns images inline to the agent; no PNG files were written to disk. Every geometric claim below is a JS measurement (`style.transform`, `style.top/left`, `getComputedStyle`), not an eyeball. Marketing claims are labelled as such and never reported as verified.

No account was created, no credential entered, no form submitted except two read-only person-picker searches on `tocvoquangngai.com` over data already public on that page.

## Summary Table

| Site | Loads? | Login-gated? | Tree tech | Tree size seen | Đa thê handled? | Xưng hô? | Export? | Mobile OK? |
|---|---|---|---|---|---|---|---|---|
| gia-pha-demo.vercel.app | yes, 0 console errors | no (tree + book fully public) | HTML abs-positioned cards + 1 SVG overlay, CSS-transform zoom | **15 people, 4 đời** (not the claimed 300/15) | **no case in demo**; spouse = peer card at same row, 8px dashed link + ❤ | no | print-CSS "sách gia phả" (A4 @page), no button | **no** — sidebar 256px vs main 119px at 375px |
| ancestortree.info | yes | **yes, hard gate** — `/tree` → `/login` | unverifiable (claims "SVG + own layout engine") | none reachable | unverifiable | claims BFS "Tìm quan hệ" — unverifiable | claims GEDCOM 7.0/CSV/MD/PDF — unverifiable | unverifiable |
| giaphax.io.vn | front-end yes, **backend 500 (dead)** | no gate, but empty workspace | unverifiable (SVG defs present in bundle) | **0 people** — no demo data | **modelled**: `spouseIds[]`, `second_wife:"Vợ thứ"`, `concubine:"Thứ thất"` | **real term table in bundle** (paternal/maternal aware) — engine unverifiable, no data | JSON backup claimed; no GEDCOM/PDF strings in bundle | **yes**, clean |
| tocvoquangngai.com/pha-do | yes | **no — 292 real names public** | SVG `links_view` + HTML `cards_view` sharing one CSS transform | **292 members / 398 cards / 5 đời** | no case found in branch views | **VERIFIED WORKING** ("là ông ngoại của") | **none** — no print CSS, no export button | yes, purpose-built mobile chrome |

Sites reachable: 4/4 (one with a dead backend, one fully gated).

---

## gia-pha-demo.vercel.app/tree — Gia-Pha-Dien-Tu (Lê Huy Đức Anh)

**What loaded.** `/tree` 200, zero console errors, 100 % same-origin (Next.js/Turbopack, fonts self-hosted `_next/static/media/*.woff2`), **zero third-party hosts**. Tree page DOM = 343 elements total.

**Reality vs the pitch.** The claim is a 15-generation / 300+ person clan. The public demo carries **15 people over 4 đời** (Đ1=2, Đ2=4, Đ3=6, Đ4=3). `/people` reports "0 người trong gia phả", `/directory` "Chưa có thành viên nào", `/events` "Chưa có sự kiện nào". Only `/tree` and `/book` have data, and they disagree — the header says "Dòng họ Lê Huy" while the book cover says "DÒNG HỌ NGUYỄN VĂN". So the phonebook, event calendar and member list are unpopulated shells. **The large-tree question this demo was supposed to answer is unanswered.**

**Tree tech.** Hybrid, and it is the right hybrid:
- one wrapper `<div style="transform: translate(-107.7px, 12.99px) scale(0.895); transform-origin: 0 0; width:1310px; height:600px">`
- inside it, one `<svg class="absolute inset-0 pointer-events-none">` for connectors
- inside it, one absolutely-positioned `<div>` per person, `left/top` in layout units

**Generation-row alignment: perfect, 0 px variance.** Measured `style.top` of all 15 nodes → exactly four values: `0, 160, 320, 480`. Pitch 160 px for an 80 px card. Card box is a **fixed 180 × 80 px with `truncate` on the name**, so long/short names cannot shift anything. Adjacent-card pitch is a uniform **188 px** (180 + 8) whether the neighbour is a sibling or a spouse. The reported "#1 defect in this space" (rows drifting when a single-child branch is shorter than a multi-child branch) **does not occur here**, because y is a function of generation, not of subtree height.

**Connector routing — worth copying.** All parent→child segments live in a *single* `<path>` whose `d` concatenates M/L pairs:
`M792,80L792,120M388,120L1196,120M388,120L388,160M890,120L890,160…`
i.e. drop from the couple's midpoint to the mid-gutter y, one horizontal bus along the mid-gutter, then one vertical per child. One DOM node for the entire edge set.

**Multi-spouse: not demonstrated.** Six families, three couples (An–Lan, Bình–Mai, Hải–Hoa), no man with two wives. Spouse presentation is: two peer cards on the same generation row, 8 px apart, joined by a `stroke-dasharray="4,3"` `#cbd5e1` path **8 px long** with a 10 px `❤` glyph at the midpoint. A wife therefore consumes a full grid column. Extrapolating (inference, not observed): a man with 3 wives would occupy 4 columns, and since children hang off "the couple midpoint", there is no visible mechanism to attribute children to a specific wife.

**Deceased marking — the most dignified of the software products.** Triple-encoded, all soft:
1. avatar `bg-indigo-300 text-indigo-800 opacity-60` (living: `bg-indigo-400 text-white`)
2. death year in the range: `1920 — 1995` vs `1975 — nay`
3. a 9 px `slate-400` label `✝ Đã mất` (living: 9 px `emerald-600` `● Còn sống`)

No red, no black band, no skull. Genuinely restrained. But no ngày giỗ and no âm lịch anywhere.

**Chính tộc / ngoại tộc is implemented, not just claimed.** Blood members get a teal→emerald surname chip ("Lê") pinned to the avatar; married-in members get a `stone-300` avatar, **no** chip, and a `· Ngoại tộc` suffix. The stats overlay counts "Chính tộc 12 / Ngoại tộc 3". Every card carries an amber `Đời N` chip.

**Collapse / expand: best-in-class pattern.** Collapsing a branch replaces the subtree with a single amber summary card in one grid slot on the correct generation row, reading `📦 1 người · Đời 1 → 1 · ● 1 · ✝ 0 · ▶ Mở`. Count, generation span and alive/dead tally, all in the space of one node.

**Level-of-detail rendering.** At `scale(0.12)` the cards are swapped for 12 × 12 `rounded-full` dots with a hover tooltip `Nguyễn Văn An · Đời 1`. Real LOD, not just CSS scaling.

**View modes work and are URL-addressable.** Clicking a node opens a well-designed action menu: *Xem chi tiết / Hậu duệ từ đây / Tổ tiên / Căn giữa / Sao chép link hậu duệ / Toàn cảnh / Đóng góp thông tin*. Descendant mode re-roots (`/tree?view=descendant&person=P003`), shows "4 thành viên · Hậu duệ của Nguyễn Văn Cường" and a "Gốc:" selector. **Defect:** it *renumbers* generations relative to the sub-root — Cường (真 Đời 2) is relabelled `Đ1`. For a gia phả, đời is absolute to the thủy tổ; this is wrong.

**Search is broken for how Vietnamese people actually type.** `Khoa` → match. `nguyen van khoa` → **no match**. No diacritic folding. On a phone keyboard this is the difference between usable and unusable.

**Auto-fit is buggy.** Cold load of a 15-person tree computed `scale(0.12)` and reported `11/15 nodes` — a blank-looking canvas with a few 1.4 px specks. One click of zoom-in jumped to 90 % / 15 of 15. First impression of the flagship feature is an empty page.

**"Sách gia phả" (`/book`) is the strongest single artefact I saw anywhere.** Fully generated, 8 pages: cover ("GIA PHẢ / DÒNG HỌ NGUYỄN VĂN / 4 đời · 15 thành viên / 12 người chính tộc / Xuất bản ngày 21 tháng 8, 2026") → MỤC LỤC with per-đời counts → one chapter per đời (`ĐỜI THỨ I — THỦY TỔ`, Roman numerals), each person numbered within the đời with Cha / Mẹ / Vợ / CON (n) → `PHỤ LỤC` A–Z name index split `NỘI TỘC` (12) vs `NGOẠI TỘC` (3) → closing page with the couplet *"Cây có gốc mới nở cành xanh lá / Nước có nguồn mới bể rộng sông sâu."*
Real print CSS exists: `@page { size: a4; margin: 20mm 18mm 25mm }`, `.page-break{break-before:page}`, `.person-entry{break-inside:avoid}`, `.chapter-header{break-after:avoid}`.
Two defects: (a) **no print/export button** — the user has to know Ctrl-P; (b) within ĐỜI III the entries are ordered Hải(1970), Khoa(1975), Long(1980), Hùng(1973), Khánh(1978) — i.e. **round-robin across fathers** (each father's 1st child, then each father's 2nd child). A gia phả lists all children of one father consecutively. And note what the book *is*: a prose/list book, not a wide bảng tông đồ. It sidesteps the wide-tree printing problem rather than solving it.

**Mobile: broken.** At 375 × 812 the `<aside>` stays **256 px** and `<main>` collapses to **119 px** (measured). No overflow, but the tree is simply not there; toolbar buttons run off screen; the header title wraps one word per line. There is no mobile breakpoint for the shell.

**Privacy.** Cleanest of the four: every request same-origin, no analytics, no CDN, no error reporting, fonts self-hosted. Data is fictional demo data. The tree is public without auth; the editor is presumably behind the "Đăng nhập" button (inference — logged out, the only node action is "Đóng góp thông tin").

---

## ancestortree.info — AncestorTree (Minh-Tam-Solution / Đặng Thế Tài)

**Login-gated, no public demo.** `/welcome` renders a long feature marketing page. `/tree` redirects to `/login` (Email + Mật khẩu, plus a "Mã OTP" tab). Public routes are only `/welcome`, `/council`, `/ancestral-hall`, `/register-member`, `/login`, `/register`, `/forgot-password`. `/ancestral-hall` is empty ("Thông tin nhà thờ họ chưa được cập nhật"). **Nothing about the tree, the calendar, the DFS cầu-đường rota, chi/nhánh, Can Chi or GEDCOM could be verified.** I did not log in.

**Direct architectural competitor.** Their own stack list on `/welcome`: **Next.js 16, React 19, TypeScript, Tailwind 4, Supabase (PostgreSQL), shadcn/ui, Electron, sql.js (SQLite WASM)**. MIT, v2.5.0. That is our stack plus a Supabase cloud tier and an Electron desktop tier. They describe the desktop build as data-in-`~/AncestorTree/`, back-up-by-copying-the-folder-to-USB-or-Google-Drive — the same local-first instinct, executed as a folder-copy rather than sync. The desktop installer is **not released**: "Bản Desktop … đang chờ Apple Developer Certificate."

**Claimed but unverified** (record as claims only): lunar↔solar conversion + annual giỗ reminders; auto chi/nhánh and đời computation; cầu-đường DFS rota; BFS pathfinding "Tìm quan hệ" between two members; Fuse.js fuzzy search "hỗ trợ dấu tiếng Việt"; GEDCOM 7.0 / CSV / Markdown / PDF export; Supabase RLS with 4 roles; "Đã test tốt với 500+ thành viên, 10+ đời".

Note: their "Tìm quan hệ" is described as *pathfinding*, i.e. the relationship **path**, not necessarily a computed xưng hô term. The feature list nowhere says "xưng hô".

**Author-published screenshot** `/screenshots/tree-view.png` (3024 × 1964, Electron on macOS) — evidence of intent, not of behaviour. It shows: legend "Viền xanh = Nam · Viền hồng = Nữ · Đường hồng = Vợ chồng · ✝ = Đã mất"; rectangular cards with a colour border by sex; generation rows that look aligned; couples adjacent joined by a pink line; a **minimap** toggle; a zoom readout (95 %); "Xem nhánh từ: [Tìm thành viên…]" with "Đang xem: Toàn bộ gia phả"; an **"Xuất GEDCOM"** button; a mobile hint "Trên mobile: kéo để di chuyển, dùng nút +/- để zoom"; and a left nav that names every cultural module (Lịch cúng lễ, Vinh danh, Quỹ khuyến học, Hương ước, Cầu đường) plus admin screens including "Đề xuất chỉnh sửa" (a change-proposal queue). `/screenshots/mobile-view.png` shows only the mobile home screen, not the tree — mobile tree usability stays unverified.

**Privacy.** Public pages made zero third-party requests; fonts self-hosted. Supabase is presumably only contacted after auth (inference — I never submitted the form). Their data model is a hosted Postgres, so a family's data lives on the maintainer's Supabase project, not the family's own storage.

**Strategic read.** This is the most feature-ambitious competitor and the closest to us technically, but it is a **single-clan deployment with an auth wall**, and the "install it yourself" path is `git clone` + Docker Desktop + pnpm (their own quickstart), or an unreleased unsigned desktop build. Zero-setup is exactly the gap.

---

## giaphax.io.vn — GIAPHAX (Minh Nguyễn)

**The front-end loads; the backend is dead.** Only five files on load — `styles.css`, `supabase-config.js`, `runtime-config.js`, `supabase-firestore-compat.js`, `app.js` (629,825 bytes). A plain static vanilla-JS app, no framework bundle, zero third-party hosts. Then the "Cộng đồng" tab fires `POST /api/supabase/query` → **500**, and the console gives the exact cause:

```
{code: XX000, status: 500, message: (ENOTFOUND) tenant/user postgres.yuxixrxqlhgleptswxyf not found}
```

That is the Supavisor error for a Supabase project that has been **paused or deleted** — the free-tier tenant no longer resolves. The UI reports "Danh Sách Gia Phả · 0 gia phả · Không thể tải danh sách gia phả." Cloud sync, sign-in and the public catalogue are all non-functional. The static half still works because it is served from a CDN. **This is the second competitor whose managed backend has evaporated while its static assets survive** — a very direct argument for our no-backend thesis.

**No demo data at all.** The workspace opens at Tổng thành viên 0 / Còn sống 0 / Số đời 0 / Số chi 0 / **Giỗ trong 30 ngày 0**, tree area "Chưa có dữ liệu gia phả". "Xem demo" links to an SEO article, not a demo tree. Because entering people would mean submitting a form, **the renderer, row alignment, đa thê layout and xưng hô output are all unverified by execution.** What follows is bundle inspection plus live UI chrome.

**Tree controls that exist in the live UI** (empty canvas, but the controls are real):
`Chế độ xem [Tree | Mindmap]` · `Kiểu cây [Hậu duệ | Tổ tiên]` · `Số tầng −/32/+` · `Thu phóng −/100 %/+` · `Quay lại` · `Bao quát` · `Toàn màn hình` · **`Ẩn phối ngẫu`** · `Chọn root`.
Two of those are answers to problems we have: `Số tầng` is a hard depth limiter (default 32) and `Ẩn phối ngẫu` hides spouses to halve the tree's width.

**Cultural depth in the data model — the deepest of the four.** From `app.js`:
- `spouseIds` (83 occurrences) and `spouses` (59) → **plural spouses are first-class**, not a single `spouse_id`.
- `RELATION_ADDRESS_BOOK` — a structured Vietnamese kinship table with `meta:{language:"vi-VN", culture:"Vietnamese"}` and an `en` counterpart. Categories: `ancestors.great_grandparents.{paternal,maternal}.{male,female}`, `grandparents`, `grand_uncle_aunt`, `parents_generation`, `same_generation.{cousins.{older,younger}, siblings, in_laws}`, `descendants`, plus **`birth_order_suffix`** (for Anh Hai / Anh Ba style ordering).
- Terms present: Cụ ông, Cụ bà, Ông nội, Bà nội, Ông ngoại, Bà ngoại, Bác, Bác gái, Chú, Cô, Thím, Dượng, Cậu, Dì, Mợ, Chị, Chị dâu, Anh rể, Bố vợ, Mẹ vợ. Fallbacks by rank (`ancestor_rank_neutral: "Cụ"`).
- `special_cases: { step_child:"Con riêng", adopted_child:"Con nuôi", second_wife:"Vợ thứ", concubine:"Thứ thất" }` — **the only product of the four that names đa thê and concubinage in its vocabulary.**
- Path helpers: `isUpwardRelationEdgeType(up_father|up_mother|up_parent)`, `relationSideFromUpType() → paternal|maternal`. So the engine walks the path and picks paternal vs maternal terms. That is the correct shape.
- Scope limit: the `vi` table is only ~1,695 characters. No regional Bắc/Trung/Nam variants, no chắt/chút/cố depth, and "xưng hô" itself appears only in onboarding copy.

**Not in the bundle** (searched): no `amLich`/`lunar`/`solar2lunar`, no `canchi`/`Giáp`, no `GEDCOM`, no `jspdf`/`html2canvas`. So despite the "Giỗ trong 30 ngày" counter, **there is no âm lịch conversion and no Can Chi** — giỗ must be a solar-date reminder. Export is JSON only ("sao lưu bằng JSON"); 4 `print(` and 3 `toBlob` call sites suggest browser-print and canvas-to-image, nothing more.

**Filtering / search UI** is the most complete: Lọc theo chi, Lọc theo đời, Giới tính, Trạng thái, Tuổi từ→đến, sort asc/desc, search by tên / tuổi / **mã** / **quê quán**, paginated 24/page. Members carry a `Mã` (code) column.

**Privacy.** Better than expected in one respect and worse in another. Better: Supabase is proxied server-side (`POST /api/supabase/query`), so no anon key or third-party host is exposed to the browser. Worse: the client bundle hardcodes `BOOTSTRAP_ADMIN_EMAIL = "minhnh510@gmail.com"` (identifies the maintainer and reveals the admin-bootstrap mechanism); `logAnalyticsEvent("genealogy_open", {is_public, role, access_mode})` ships usage telemetry; and there is a **paginated public catalogue of published family trees** (`PUBLIC_GENEALOGY_CATALOG_PAGE_SIZE = 24`, `URL_GENEALOGY_QUERY_KEY = "g"`, `URL_GENEALOGY_SLUG_QUERY_KEY = "name"`) — i.e. a family that flips to public gets *listed and browsable*, which is precisely the "lộ hết tên cả gia tộc" fear from the threads. It currently lists nothing only because the database is gone.

**Mobile: good.** 375 × 812 → `scrollWidth == clientWidth == 375`, no overflow, stacked full-width CTAs, horizontally scrollable tab strip, 2-up stat cards. Correct `viewport` meta.

---

## tocvoquangngai.com/pha-do — Tộc Võ, Quảng Ngãi (a real clan, in production)

Note: the path in the brief (`/gia-pha`) is a **404**. The live route is **`/pha-do`**.

**This is the most valuable target of the four.** `Phả Đồ Tộc Võ — 5 đời · 292 thành viên`, fully public, **no login**, real names.

### Architecture — this is the reference implementation

```
svg.main_svg
└ g.view            [CSS transform: translate(692.8px,160.5px) scale(0.276)]
  ├ g.links_view    → 397 × <path class="link">   (cubic-Bezier orthogonal routing)
  └ g.cards_view    → EMPTY
div.cards_view      [SAME CSS transform, kept in lock-step]
└ 398 × div.card_cont   → HTML cards
```

Links in SVG, cards in HTML, **both driven by one identical CSS transform string**. Same conclusion as gia-pha-demo, arrived at independently, on 26× the data. Class names (`main_svg` / `links_view` / `cards_view` / `fit_screen_icon`) mirror BALKAN FamilyTree's DOM vocabulary, but there is no global `FamilyTree` object — it is bundled or reimplemented inside a Next.js App Router app (route groups `(public)` / `(admin)`).

Cards are emitted as **raw HTML strings with inline `onmouseenter`/`onmouseleave` attributes**, not React event handlers — a deliberate way to keep 398 nodes out of React's reconciler.

### Generation-row alignment: 0 px variance across 398 nodes

Measured `translate(x,y)` on every `.card_cont`. Distinct y values in the full tree: **exactly `0, 375, 750, 1125, 1500`.** Pitch exactly 375 px for a 175 px card (200 px gutter). Row populations: ĐỜI 1 = 106, ĐỜI 2 = 60, ĐỜI 3 = 116, ĐỜI 4 = 86, ĐỜI 5 = 30. Not one node drifts. Note the inner card carries `transform: translate(-50%,-50%)`, so **the stored (x,y) is the card centre**, which is what makes the connector maths clean.

### Horizontal layout: 170 px quantum, subtree-aware

Base column quantum **170 px** (130 card + 40 gap). In the "Võ Bờm" branch (51 cards) the observed same-row gaps were 170, 212.5, 276.3, 297.5, 340, 382.5, 467.5, 552.5, 637.5, 680 — a real tidy-tree where a node is centred over its own subtree and siblings separate by subtree width. **Gap 170 is used for couples *and* for siblings**, so spacing alone cannot tell you which is which; only the link paths carry that.

### The full-clan view is measurably broken

Same-row adjacent x-gap histogram over all 398 cards:

`{0: 231, 85: 78, 255: 9, 382.5: 7, 297.5: 6, 170: 4, 425: 4, 552.5: 4, 467.5: 4, 340: 3, 680: 2, 765: 2}`

**231 of ~393 adjacent pairs sit at gap 0 — perfect overlap** — and many card labels render as empty strings. Visually it is a 1-px-high line of specks in which not one name is readable; the ĐỜI 1 row begins with a `🏠` card followed by ~100 blank ones. Meanwhile the geometry it *claims*: xMin −15,921.6 → xMax +11,735.3 = **27,657 px wide** against 1,675 px tall, aspect **≈ 16.5 : 1**. Even fitted, 292 people on one canvas is eight screens wide.

Selecting a single branch from the sidebar fixes everything — that view lays out correctly and is legible. **The per-branch view is the product; "the whole clan on one page" does not work even for a real 292-person clan.**

Performance: 4,827 DOM elements for 398 cards (~12 per card), all rendered, **no virtualization**, no LOD. Pan/zoom was smooth in the branch view.

### Traditional presentation conventions (the "trang nghiêm" reference)

**Card anatomy** — 130 × 175 px, bg `#FAF5EA`, 2 px border `#5B8C5A` male / `#C47A8A` female, radius 8, shadow `0 2px 10px rgba(44,24,16,.1)`; a 98 px photo band on `#E8F0E8`; a 3 px accent bar `#5B8C5A`; then, centred: **name** 11 px/700 `#2C1810` → **dates** 9 px `#8B7355` → **`ĐỜI N`** 7 px, `letter-spacing:.1em`, `#A0937D`. Three fields per person. That is all.

**Palette:** parchment `background.png` with mây (cloud) scrolls and a 回 meander border; cream `#FAF5EA`, ink `#2C1810`, muted brown `#8B7355`, faint `#A0937D`, male green `#5B8C5A`/`#4A5D23`, female dusty rose `#C47A8A`, photo bg `#E8F0E8`; site chrome deep maroon + gold serif, with a gold-framed hoành phi photograph and the couplet *"Cây có gốc, nước có nguồn"*.

**Deceased: no marker at all.** Võ Quý (1957–2016, dead) and Võ Hòa (1976–?, alive) have **byte-identical** inline styles. The legend offers only `● Nam · ● Nữ · ○ Chưa rõ`. The only signal a person has died is the closing year in the range. This is the answer to the "đau lòng" complaint: **the convention a real clan actually publishes is to say nothing — just the years.**

**Ordering & titles.** Honorifics live *inside* the name string: `Ô.Võ Duy Phong`, `Ô.Võ Thao`, `Cụ Thủy tổ : VÕ VĂN PHONG`, `CỤ VÕ VĂN CHƠI`, `bà Thao`, `Bà Võ Thị Huấn`. ALL-CAPS is reserved for the most senior ancestors — **capitalisation itself encodes reverence**. And critically: **`Bà Võ Văn Mượng`** — a wife recorded only as "Bà ‹husband's full name›", with no name of her own. Any schema that requires a personal name, or that derives display text from `given_name`, will mangle real clan records.

**Data completeness is far worse than any demo suggests.** `? – ?` is common (`Võ Hỡm`, `Võ Văn Trung`), birth-only is common (`1940`), and death year is usually absent. A real clan tree is mostly holes.

**The clan is a forest, not a tree.** ĐỜI 1 holds **106** records and the sidebar lists ~50 separate branch founders, each labelled `ĐỜI 1 · N người` (Võ Hỡm 18, Ô.Võ Duy Phong 12, Ô.Võ Thao 8, Ô.Võ Loan 11, Võ Văn Chai 13, `Cụ Thủy tổ : VÕ VĂN PHONG` 16, Ô. Võ Có 11, VÕ VĂN MINH 9, …). Only one is marked Thủy tổ; the rest are unconnected roots whose link to the trunk is lost. **Multi-root is the normal case, not an edge case.**

**Real data contains duplicates.** `Phạm Thị Hằng | 1996 – ?` appears twice in the same generation row (x = −1360 and x = −850), attached to two different husbands — a duplicated in-law record in production data.

### Xưng hô: VERIFIED WORKING (the only site where I saw it run)

Two read-only queries through "Tìm quan hệ" on already-public names:

- `Võ Quý` + `Võ Minh Huy` → **"Võ Quý *là ông ngoại của* Võ Minh Huy"** — side-aware and correct: the link runs through a daughter, so *ngoại*, not *nội*.
- `Võ Văn Sĩ` + `Võ Văn Minh Thuận` → **"Võ Văn Sĩ *là cháu trai của* Võ Hòa *là cha của* Võ Văn Minh Thuận"**

So it renders a **path of hops with a term per hop**, and collapses to a single term only for direct-line 2-hop cases. Lateral relations are *not* reduced to one Vietnamese term — nobody says "anh họ" / "em họ" here. Also note "cháu trai" was used for a structurally nephew/grandson relation, which is exactly the ambiguity a real engine has to disambiguate.

**Search is diacritics-insensitive**, correctly: `Vo Quy` → `Võ Quý · Đời 2`; `Vo Minh Huy` → `Võ Minh Huy · Đời 4`. The opposite of gia-pha-demo.

**"Danh sách" tab:** 292 members, 20/page, 15 pages, three fields each (name · Đời N · years).

### Export & privacy

**No export whatsoever** — zero `@media print` / `@page` rules, no print or download button anywhere. A real clan published its phả đồ and cannot get a printable copy out of it.

**Privacy.** 100 % same-origin, self-hosted `woff2`, no analytics, no CDN, no error reporting, and no XHR/API call at all (data ships with the page). But: **292 real Vietnamese names, their birth years, their đời, their parents, their spouses, and a working relationship-path finder over all of it — completely public, no auth.** One mitigation, and it matters: the "photos" are the generic placeholders `/img_avatar_man.svg`, `/img_avatar_woman.svg`, `/img_avatar_unknow.svg`. **No real faces are exposed.** So the exposure is a full kinship graph of a living family with no photographs — bad enough, and the fear in the threads is well-founded, but not as bad as it looked.

**Mobile: the best of the four.** Purpose-built chrome — hamburger `MENU`, icon-only toolbar (phả đồ / danh sách toggle, search, tìm quan hệ), and the branch picker relocated to a horizontally-scrolling strip pinned to the bottom edge. No overflow. The full-clan view is still an illegible speck-line, same as desktop.

---

## Layout Lessons For Our Canvas

Against `src/components/FamilyTreeCanvas.tsx` as it stands: `COL_W = 240`, `ROW_H = 180`, integer grid coords `{x, y}`, cards at `left: x*COL_W; top: y*ROW_H` with `translate(-50%,-50%)`, and one `<svg>` holding one `<path>` per edge. **The architecture is already right** — HTML cards + SVG links + centre-anchored positioning is exactly what both working competitors converged on. The gaps are specific.

1. **Key `y` off absolute đời, never off subtree height — and never off the current root.** Both working products use a constant generation pitch and both measured **0 px row variance** (gia-pha-demo: 15 nodes at top ∈ {0,160,320,480}; tocvo: 398 nodes at y ∈ {0,375,750,1125,1500}). This is why the reported "#1 defect" is absent in both. Our `y` is currently a hardcoded anchor-relative 5-tier map (`anchor → y:2`, parents → y:1, …). Replace it with `y = person.generation` computed once for the whole graph, so re-rooting pans the viewport instead of relabelling people. gia-pha-demo's descendant mode gets this wrong (it renumbers Đời 2 → Đ1); don't copy that.

2. **Fix the card box and truncate the name.** gia-pha-demo: 180 × 80, `truncate`. tocvo: 130 × 175, `word-wrap:break-word` in a fixed box. Neither lets text influence geometry, which is the other half of the "tên dài/ngắn ảnh hưởng hiển thị ngang hàng" complaint. Our `COL_W/ROW_H` grid already implies this — enforce it with explicit `width`/`height` and overflow clipping on the card, not just on the slot.

3. **Concatenate all parent→child segments into ONE `<path>`.** gia-pha-demo emits a single `d` = `M792,80L792,120M388,120L1196,120M388,120L388,160…`: drop from couple-midpoint to mid-gutter, one horizontal bus at `y + ROW_H/2`, one vertical per child. Our code already computes exactly this polyline shape (`M ${pMidX} ${pY+60} L ${pMidX} ${pY+ROW_H/2} L ${cX} ${pY+ROW_H/2} L ${cX} ${cY-60}`) but emits one `<path>` element per edge. Merge them into one path per *style class* (solid family links, dashed spouse links). At 1,000 people that is 2 DOM nodes instead of ~1,000.

4. **Multiple spouses: reserve columns to the right of the husband, and attribute children by their own mini-bus.** Nobody has solved this, so here is the design the measurements support. Keep the wives as peer cards on the same generation row (both products do; the 170/188 px quantum makes it free) at `x = husband.x + 1 … + n`. Then **do not** hang children off a single "couple midpoint" — that is the exact mechanism that loses the attribution. Instead give **each marriage its own bus segment** at a distinct sub-y inside the gutter (e.g. `y + ROW_H/2 - k*8` for the k-th marriage), spanning only that wife's children, and start it from that wife's card centre rather than the couple midpoint. Tint or dash the k-th marriage's bus differently and put an ordinal on the spouse link (`Vợ 1`, `Vợ 2`) rather than a bare `❤`. Children of wife *k* then sort contiguously within the sibling run. Adopt GIAPHAX's vocabulary while you are there: `Vợ thứ`, `Thứ thất`, `Con riêng`, `Con nuôi`, and a `spouseIds[]`-shaped model (they carry 83 references to it) rather than a scalar spouse.

5. **Collapse large branches into a summary card that keeps its grid slot.** Copy gia-pha-demo's amber placeholder verbatim in spirit: `📦 N người · Đời a → b · ● alive · ✝ dead · ▶ Mở`, one slot wide, sitting on the correct generation row. Add GIAPHAX's two width-reducers as toggles: a **`Số tầng`** depth cap (they default to 32) and **`Ẩn phối ngẫu`** — hiding spouses roughly halves horizontal extent, since tocvo's 292 members became 398 cards (+36 %) once spouses were drawn.

6. **Auto-collapse must be the default at real scale, because "one page" does not work.** tocvo's honest numbers: 27,657 × 1,675 px, aspect 16.5 : 1, eight screens wide fitted — and their whole-clan layout collapses (231 of ~393 same-row pairs at gap 0, blank labels). Ship the per-branch view as the primary experience with an explicit branch picker (tocvo's left rail, each entry `ĐỜI 1 · N người`), and treat "toàn cảnh" as a navigational overview, not a reading view.

7. **Keep 300–1,000 nodes fast with three cheap tricks, all observed working.** (a) *LOD*: below ~25 % zoom swap cards for ~12 px dots with a hover tooltip — gia-pha-demo does this and it is why its overview stays interactive. (b) *One transform, two layers*: put the identical `transform: translate(px,px) scale(s)` on both the SVG group and the HTML card layer and never touch per-node styles while panning — tocvo drives 398 cards this way. (c) *Keep cards out of the reconciler*: tocvo renders cards as HTML strings with inline `onmouseenter`, ~12 DOM elements per card, 4,827 total. Our budget: aim under ~10 elements/card so 1,000 people stays under ~10 k elements. Add viewport culling — gia-pha-demo shows a live `11/15 nodes` counter, so it culls; tocvo does not, and does not need to at 398.

8. **Fold diacritics in search, and index the accent-free form.** `nguyen van khoa` finds nothing on gia-pha-demo; `Vo Quy` finds `Võ Quý` on tocvo. Normalise NFD + strip combining marks on both sides at index time.

9. **Deceased styling: follow the real clan, not the software.** tocvo — the only production clan site — applies **no marker at all**; the death year in `1957 – 2016` is the entire signal. If we mark at all, cap it at gia-pha-demo's level: avatar `opacity .6` plus a 9 px grey `✝ Đã mất`. Never red, never a band, and make the same treatment apply to women (the "faded avatar isn't noticeable for women" complaint is a *contrast* bug — apply the fade to the card border and the name colour too, not only to a photo the record probably doesn't have).

10. **Design for the data you will actually get.** Multi-root forests (tocvo: 106 people at ĐỜI 1, ~50 unconnected founders, one marked Thủy tổ) — so the canvas must render a forest with per-root framing, not assume one ancestor. `? – ?` dates, birth-only dates, honorifics embedded in the name (`Ô.`, `Cụ Thủy tổ :`, ALL-CAPS for elders), and wives with no name of their own (`Bà Võ Văn Mượng`). Store the display string verbatim; never require given/surname decomposition. Expect duplicate in-law records and offer a merge.

11. **Copy the parchment discipline, borrow the exact tokens.** tocvo's ink `#2C1810`, cream `#FAF5EA`, muted `#8B7355`, faint `#A0937D`, male `#5B8C5A`, female `#C47A8A`, photo bg `#E8F0E8`; three fields per card and nothing more (name → years → `ĐỜI N`, at 11/9/7 px with `.1em` tracking on the đời label). Restraint *is* the dignity.

---

## Feature Gaps Nobody Has Solved

Ranked by (unmet demand × nobody-has-it).

1. **Đa thê rendering with child attribution.** Zero of four shows it. gia-pha-demo hangs children off a single couple midpoint (mechanically incapable of attributing them). tocvo has no case in its data and no spouse-specific card class. AncestorTree is unverifiable. Only GIAPHAX even has the vocabulary (`Vợ thứ`, `Thứ thất`) and a `spouseIds[]` model — and its backend is dead, so nothing renders. **This is the single largest open opportunity and it is a layout problem, which means we can just solve it.**
2. **A printable bảng tông đồ.** gia-pha-demo prints a *prose book* (good A4 CSS, `break-inside:avoid`, but no button) and thereby avoids the chart entirely. tocvo has zero print CSS and no export. Nobody prints a wide lineage chart. Tiling a 27,657 px chart across A3/A4 sheets with repeated ancestor stubs and edge-continuation markers is unclaimed territory.
3. **Xưng hô as a single collapsed term for lateral kin.** Only tocvo runs at all, and it returns a hop-chain ("là cháu trai của X là cha của Y") rather than "anh họ". GIAPHAX has the term table but no working engine and no Bắc/Trung/Nam variants. Nobody handles regional variation, `chắt/chút/cố` depth, or the `cháu trai` grandson-vs-nephew ambiguity.
4. **Âm lịch + ngày giỗ + Can Chi, actually implemented.** AncestorTree claims all three; nothing is verifiable behind its login. GIAPHAX has a "Giỗ trong 30 ngày" counter but **no lunar or Can Chi code in its 630 KB bundle**. gia-pha-demo and tocvo show only Gregorian years. So the most-cited cultural feature is, as far as anything observable goes, unimplemented across the field.
5. **A real large-tree view.** The only production clan site's whole-clan layout **collapses** (231 overlapping pairs, blank labels), and the flagship demo carries 15 people while claiming 300+. Nobody has demonstrated a legible 300-person view. A correct multi-root forest layout + LOD + collapse would be visibly better than everything shipped.
6. **Multi-root forests as a first-class concept.** tocvo's real data is ~50 disconnected ĐỜI 1 founders. Every product's UI assumes a single thủy tổ; tocvo copes only by making you pick a branch first.
7. **Mobile data entry.** Nobody demonstrated it. gia-pha-demo's shell has no mobile breakpoint at all (main = 119 px). tocvo's mobile chrome is read-only. AncestorTree's own mobile screenshot is the home screen.
8. **Privacy that a clan can actually reason about.** GIAPHAX ships a *browsable public catalogue* of published trees; tocvo publishes 292 real names and a working relationship-finder with no auth; AncestorTree solves it by walling everything off, which kills the "share with relatives" use case. Nobody offers a middle setting — e.g. living members redacted, deceased ancestors public, share by unguessable link with no catalogue.
9. **Diacritic-insensitive search.** Trivially cheap, and the flagship demo still fails it.
10. **Import from what families already have.** Only AncestorTree claims GEDCOM (unverified); GIAPHAX offers JSON only. Nobody offers a paste-from-Word/Excel path, which is where every real gia phả currently lives.
11. **Dedup / merge of in-law records.** Real data has duplicates (measured: the same wife recorded twice on tocvo). No product surfaces this.

---

## Dead / Abandoned Projects

- **GIAPHAX (`giaphax.io.vn`) — backend dead, front-end alive.** `POST /api/supabase/query` → 500, `XX000: (ENOTFOUND) tenant/user postgres.yuxixrxqlhgleptswxyf not found`. That is a Supabase project that has been paused or deleted; the free-tier tenant no longer resolves. Consequence: sign-in, cloud sync and the public catalogue are all gone, while `app.js` still serves happily from the CDN and the app half-works locally. The `supabase-firestore-compat.js` shim also shows this is already its *second* backend (migrated off Firebase). **A project that had to pick a managed database twice, and has now outlived the second one.**
- **"Sakura Family Tree" (`hyhon.io.vn`) — product gone, domain repurposed.** The domain resolves 200, but now serves *"Võ Đào Huy Hoàng | System / Network / Security Engineer"*, a personal CV/portfolio. Zero occurrences of "gia phả", "Sakura" or "family tree" in the page text; zero links matching `/pha|sakura|tree|family/`. No redirect, no archive, no notice — consistent with the reported VPS expiry. Every family that entered data there lost it silently.
- **AncestorTree — not dead, but fragile in the same way.** Depends on a hosted Supabase project owned by one volunteer maintainer; the entire tree is behind that login; and the offline escape hatch (the Electron desktop build) is **unreleased**, blocked on an Apple Developer certificate. Their own FAQ tells users to back up by copying `~/AncestorTree/` to a USB stick once a month.
- **gia-pha-demo — alive and free to run** (static Next.js on Vercel, zero third-party calls), which is exactly why it is the one demo that still renders. Its own failure mode is different: unpopulated features (`/people`, `/directory`, `/events` all empty) and mismatched demo data.

Read together: **two of four backends have already failed, and the two survivors are the ones with no backend to fail.** The static/local-first thesis is not speculative here — it is the observed difference between the sites that still work and the sites that don't.

---

## Unresolved Questions

1. **Đa thê in production.** No live example found anywhere. tocvo's 292-person dataset had none in the branches I measured, and I could not query the whole graph (data arrives with the page, no API). Is đa thê actually present in real clan data at a rate that justifies the layout complexity, or is it mostly historical (pre-1959) and therefore concentrated in đời 1–3 where dates are already `? – ?`?
2. **AncestorTree behind the login.** Its cultural feature set (âm lịch/Can Chi, cầu-đường DFS, chi/nhánh auto-compute, GEDCOM 7.0, 500-member test) is the most ambitious in the field and is **entirely unverified**. It is MIT-licensed — the honest way to check is to read `github.com/Minh-Tam-Solution/AncestorTree` rather than the marketing page. Worth a separate source-read task.
3. **GIAPHAX's renderer and xưng hô engine.** The term table is real and well-shaped, but with no data and a dead backend I never saw a tree drawn or a relationship computed. Verifying would require entering people, which was out of scope. Its `Tree | Mindmap` dual mode and `Số tầng`/`Ẩn phối ngẫu` controls are also unevaluated.
4. **Why tocvo's full-clan layout collapses.** 231 same-row pairs at gap 0 plus blank labels looks like the layout engine failing on a **forest** (106 roots) rather than on scale — it handles a 51-card branch perfectly. If that diagnosis is right it is direct evidence that multi-root is the hard part, not node count. Not confirmed.
5. **Does anyone print?** No product offers a working export. Unknown whether clans currently print at all, or whether the paper phả is produced entirely outside these tools (Word) — which would change how much the tiled-chart feature is worth.
6. **The regional xưng hô question.** No product has Bắc/Trung/Nam variants. Unknown whether users would accept one canonical term set or would reject output that uses the wrong region's word.
7. **Acceptable privacy default.** tocvo publishes 292 real names with no auth and (apparently) no complaint; the FB threads say clans are afraid of exactly that. The reconciling variable is probably *photos* — tocvo exposes none, only placeholder avatars. Unverified whether "names public, faces never" is the line families actually draw.
8. **Perf ceiling.** Largest tree I could measure was 398 cards / 4,827 DOM elements, and it was smooth. Our target is 300–1,000 people, i.e. up to ~1,400 cards with spouses. Nothing observed tells us where the HTML-card approach breaks; needs our own benchmark.
