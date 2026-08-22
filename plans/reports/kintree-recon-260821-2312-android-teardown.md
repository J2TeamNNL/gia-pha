# KinTree (dev.creaton.kintree) — Android Competitive Teardown

Date: 2026-08-21. Device: Xiaomi 23127PN0CG, Android (1200x2670 @480dpi), serial `192.168.1.14:37101`.
Method: read-only. `dumpsys` + APK pull/inventory + live UI driving (screencap + uiautomator).
No account created, no login, no purchase, no trial, no payment data, no uninstall/clear-data.

Screenshots referenced below live in:
`/private/tmp/claude-501/-Users-hangvalong-Code-projects-gia-pha/d8a96923-2c55-40c9-b8ad-7296d65492a1/scratchpad/kintree/`

---

## App Identity

| Field | Value |
|---|---|
| Package | `dev.creaton.kintree` |
| App name | Kintree (icon: green bamboo "K") |
| versionName / versionCode | `1.0.5` / `67954477` |
| minSdk / targetSdk | 24 / 36 |
| Install source | `com.android.vending` (Google Play); update owner Play |
| Splits | `base, config.arm64_v8a, config.en, config.vi, config.xxhdpi` |
| Launcher activity | `dev.creaton.kintree/.MainActivity` |
| Deep link scheme | `Kintree://` (VIEW/BROWSABLE) |
| Signing | apkSigningVersion 3 |

**Framework: React Native + Expo (SDK 54), Hermes bytecode.** Evidence: `assets/index.android.bundle` is
`Hermes JavaScript bytecode, version 96` (21.8 MB); `assets/app.config` declares `"sdkVersion":"54.0.0"`,
`expo-router`, `expo-localization`, `expo-font`, `expo-calendar`, `expo-notifications`,
`expo-tracking-transparency`, `expo-build-properties`. No custom `.so` files in base APK (native libs are in
the arm64 split).

Bundled libraries seen in the manifest/providers/strings: `@react-native-firebase/app` + `messaging`
(+ `RNFBAuth`, `RNFBFirestore` force-linked on iOS), `com.pairip.licensecheck` (Google Play
anti-tamper/licensing), `com.amazon.device.iap` (Amazon IAP receiver — present but unused on Play),
`react-native-webview`, `expo-image-picker`, `com.canhub.cropper` (image cropper), `expo-clipboard`,
`expo-sharing`, `expo-filesystem`, `react-native-reanimated`, `redux` / `redux-toolkit`,
`react-navigation`, `i18next`, `@hot-updater/react-native` (OTA JS updates, channel `production`),
RevenueCat, Stripe JS.

Fonts bundled: Manrope, Inter, Source Sans 3 (7 weights each) — user-selectable.

### Requested permissions

Runtime (all currently **denied** on this device, app still fully usable):
`READ_CALENDAR`, `WRITE_CALENDAR`, `POST_NOTIFICATIONS`, `CAMERA`, `RECORD_AUDIO`,
`READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`.

Install-time: `INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`,
`com.android.vending.BILLING`, `com.android.vending.CHECK_LICENSE`,
`com.google.android.c2dm.permission.RECEIVE`, `BIND_GET_INSTALL_REFERRER_SERVICE`.

**Privacy-relevant flags:**
- `com.google.android.gms.permission.AD_ID` + `ACCESS_ADSERVICES_AD_ID` + `ACCESS_ADSERVICES_ATTRIBUTION`, and
  `expo-tracking-transparency` with iOS copy `"This identifier will be used to deliver personalized ads to you."`
  → advertising identifier collection is declared. **However no ad SDK was found** in the bundle
  (no AdMob / AppLovin / Unity / FB Audience). Inference: ad ID is for attribution/analytics today, ads possible later.
- `RECORD_AUDIO` — no audio feature was found anywhere in the UI I reached. Unexplained.
- `SYSTEM_ALERT_WINDOW` (overlay) — unexplained for a genealogy app.
- ~20 vendor launcher **badge-count** permissions (Samsung/Huawei/Oppo/HTC/Sony/Apex/Nova). Noise, but it is a
  lot of surface for a badge number.
- Broad `queriesIntents` + a very long resolved package list (the device's installed apps are enumerable) —
  standard for RN share/browser modules, but worth noting.

### Backend hosts seen in the bundle (strings)

| Host / path | Purpose (inferred unless noted) |
|---|---|
| `https://kintree.creaton.dev/terms`, `/privacy_policy`, `/supports` | Legal + support pages |
| `https://kintree.creaton.dev/auth/mobile-callback` | OAuth redirect for mobile sign-in |
| `https://kintree-updater.creaton.dev/api/check-update` | `hot-updater` OTA JS bundle updates |
| `https://oauth2.googleapis.com/token`, `/revoke`, `openidconnect.googleapis.com/v1/userinfo` | Google Sign-In (scopes `userinfo.email`, `userinfo.profile`) |
| Firebase (`rnfirebase.io` refs; Firestore/Auth/Messaging modules) | Cloud data + auth + push |
| `rev.cat` / RevenueCat (`.../customers/user-ids`, `trusted-entitlements`, `sdk-test-store`) | Subscription entitlements |
| `https://js.stripe.com/v3` | Stripe web checkout (RevenueCat web billing) |
| `/api/chatLimit...` (relative) | AI assistant quota endpoint |

**Secret handling finding:** `assets/app.config` is shipped inside the APK and contains the Android release
**keystore store/key password in plaintext** (under a `withAndroidSigning` plugin block, alongside
`./assets/android/nstudio.keystore`). Value redacted here; flagged only. Also present: Apple Team ID,
`GoogleService-Info.plist` / `google-services.json` references. This is a build-config leak, not something we
should imitate — it is the single worst hygiene issue found.

---

## Screen Map

Ordered as reached. "Gated" = blocked by the Google-only login wall.

| # | Screen | What it does | Good / Bad | Shot |
|---|---|---|---|---|
| 1 | Onboarding 1/4 — Choose Your Language | English / Tiếng Việt with flags, "can change later" | **Good**: VI is first-class, chosen before anything else | `s01.png` |
| 2 | Onboarding 2/4 — Tuỳ chỉnh giao diện | Font family (Manrope/Inter/Source Sans 3, each previewed with "Gia phả của bạn"), font size (Nhỏ/Mặc định/Lớn/Rất lớn), **name format** (Tên đầy đủ / Tên và tên đệm / Chỉ tên), age display (tuổi vs năm) | **Excellent**: solves long-Vietnamese-name overflow *before* the user ever sees a tree. Big-font option is an elder-user feature | `s02.png` |
| 3 | Onboarding 3/4 — "Gìn Giữ Câu Chuyện Gia Đình" | Value prop, Vietnamese folk-art illustration (Thánh Gióng, bamboo, palms, temple) | **Good**: culturally specific art, not stock genealogy clip-art | `s03.png` |
| 4 | Onboarding 4/4 — "Luôn Kết Nối" | Notification opt-in. **No skip button** — only "Bật Thông Báo" | **Bad**: dark-pattern-ish; I had to tap it and then "Don't allow" on the OS dialog | `s04.png`, `s05.png` |
| 5 | Paywall interstitial (post-onboarding) | Bottom-sheet carousel, 6 dots. "Làm gia phả đẹp hơn". "Xem gói nâng cấp" / "Để sau" | **Bad**: paywall before the user has entered a single person | `s06.png` |
| 6 | Gia phả (tree canvas) | The tree. Ornate red node cards, "♂ Đời N" badge, floating right toolbar: center-on-me / zoom in / zoom out / reset | **Good**: gorgeous, unmistakably Vietnamese | `s07.png`, `r04.png` |
| 7 | Node action sheet | Xem quan hệ / Xem cây của X (re-root) / Xem chi tiết / Thêm quan hệ | **Good**: re-rooting is a first-class action | `s08.png` |
| 8 | "Thêm quan hệ" spatial picker | Mini family diagram with dashed "+" circles in the correct spatial slots (Cha, Mẹ above; Vợ/Chồng beside; Con below; Anh chị em once a parent exists) | **Excellent — best idea in the app.** No relationship dropdown; you point at the position | `s09.png`, `s10.png`, `r06.png` |
| 9 | Quick-add form | **One field only**: HỌ VÀ TÊN + "Tạo". Header "Thêm Cha / Cho Me" | **Excellent**: near-zero friction; enrich later. No gender/date/order asked | `q1.xml` |
| 10 | Person detail — Thông tin | Editable field list (see inventory) | Good; thin | `p11.png`, `p12.png` |
| 11 | Birth/death date picker | Wheel picker + **Dương lịch / Âm lịch toggle** + "Nhập tay" (manual) | **Excellent**: lunar is a peer of solar, not an afterthought | `p13.png` |
| 12 | Person detail — Quan hệ | Groups by CHA MẸ / CON CÁI, each row = name + **computed kinship term** ("Ông nội", "Tôi") | Good | `k01.png` |
| 13 | Person detail — Cây | Per-person subtree tab | Not explored in depth | — |
| 14 | Lịch (calendar / lịch vạn niên) | Solar date, âm lịch day+month, **Can Chi for year/month/day** (Bính Ngọ / Bính Thân / Đinh Mão), day quality ("Tốt"), Trực (Trực Mãn), tiết khí (Lập Thu), **GIỜ HOÀNG ĐẠO** grid (Tý 23-01, Dần 03-05, Mão 05-07, Ngọ 11-13, Mùi 13-15, Dậu 17-19), "+" FAB to add events | **Excellent**: a full almanac, entirely offline | `c01.png` |
| 15 | Văn Khấn list | **"76 bài"**, search box, category chips (Tất cả, Tín ngưỡng - Lễ hội, Cầu tự, Tết Trung Nguyên, Dâng sao giải hạn, …). Each row: title + category + when to use ("Ngày 18 hàng tháng") | **Excellent content moat**, free, offline | `v01.png` |
| 16 | Văn Khấn detail (fill-in) | "Chuẩn bị" checklist + **"Điền thông tin — 4 trường"**: Hương tử con là*, Ngụ tại*, Hôm nay là ngày (pre-filled `ngày 9 tháng 7 năm 2026 (Âm lịch)` with "Đổi sang Dương lịch"), Tín chủ con về Đền…*. Each field has its own "Lưu" to remember it | **Excellent**: mail-merge for ritual. Per-field save is thoughtful | `v02.png` |
| 17 | Văn Khấn teleprompter | Dark bg, huge type, colour-coded lines (yellow refrain / pink invocations), auto-scroll with speed control `30px/s` → **Chậm / Vừa / Nhanh / Rất nhanh**, favourite star, next-article arrow | **Excellent**: designed for reading aloud while standing at an altar | `v03.png`, `v04.png` |
| 18 | Thêm (Settings) | Đăng nhập; Premium Gia Đình (PRO); Giao diện; Dữ liệu; Gia đình (PRO); Trợ giúp; Về ứng dụng; Chính sách bảo mật | Clean | `p02.png` |
| 19 | Giao diện | Chủ đề (7 themes: **Tối, Sáng, Nửa đêm, Rừng xanh, Hoàng hôn, Đại dương, Cổ phong** — Cổ phong is default); Đổi ngôn ngữ; Phông chữ (family · size); Định dạng tên; Hiển thị tuổi | **Good**: theming well beyond light/dark | `g01.png`, `g02.png` |
| 20 | Dữ liệu | **Xuất dữ liệu**, **Nhập dữ liệu** (from file), **Đặt lại cây** (wipe). All free, no login | **Good**: export is not paywalled | `p05.png` |
| 21 | Export result | Android share sheet with `kintree-export-2026-08-21T16-33-16.json` | JSON only — **no GEDCOM, no PDF/image** offered here | `p06.png` |
| 22 | Login wall | "Kintree — Đăng nhập để đồng bộ và quản lý gia phả". **Only "Tiếp tục với Google"** + "Bỏ qua" (skip). Apple Sign-In entitlement exists for iOS | **Good**: skippable. **Bad**: single provider, no email option | `q8.png` |
| 23 | Premium purchase — **GATED** | "Cần đăng nhập — Đăng nhập để mua Premium Gia Đình." | Prices unreachable pre-login | `p03.png`, `p04.png` |
| 24 | Trợ lý AI — **GATED** | "Cần đăng nhập để sử dụng Trợ lý AI Gia đình và quản lý lịch sử trò chuyện." | `p07.png` |
| 25 | Bảng tin (feed) — **GATED** | "Đăng nhập để truy cập bảng tin gia đình…" | `p08.png` |
| 26 | Gia đình (family sharing) — **GATED** | Settings row marked "Cần nâng cấp Premium · PRO" → login wall | `p02.png` |

**Not reached at all:** paywall carousel pages 2–6 (dismissed once, never re-triggered — it appears to be
show-once), plan/price screen, cloud sync UI, photo upload, GEDCOM question (settled: not offered in the
export screen, but an importer format list was never opened), landscape orientation
(`app.config` says `"orientation":"portrait"` → **landscape is not supported**).

---

## Person Field Inventory

Observed on the person detail page (`p11.png`, `p12.png`, `p15.png`). This is the **complete** list — the form
does not scroll past GHI CHÚ.

| Field | Input type | Notes |
|---|---|---|
| Ảnh đại diện | Avatar circle w/ camera badge | Photo upload; permanent cloud photo storage is a Premium benefit |
| HỌ VÀ TÊN | Free-text (single line) | **One combined name field.** No surname / middle / given split |
| GIỚI TÍNH | Select | `Nam` / `Nữ`. Auto-inferred from the relationship slot used (adding via "＋ Mẹ" produced ♀) |
| NGÀY SINH | Wheel date picker | **Dương lịch / Âm lịch toggle + "Nhập tay"** manual entry |
| TRẠNG THÁI | Select | `Còn sống` / `Đã mất` — exactly two options |
| NGÀY MẤT | Wheel date picker | **Conditional** — appears only when status = Đã mất. Also has Dương/Âm toggle |
| ĐỊA ĐIỂM AN TÁNG | Free-text | **Conditional** on Đã mất. Burial place |
| ĐỊA CHỈ | Free-text | No map picker, no geocoding |
| SỐ ĐIỆN THOẠI | Free-text | No +84 formatting/validation observed |
| NƠI LÀM VIỆC | Free-text | Workplace, not "occupation/chức vụ" |
| GHI CHÚ | Free-text | Catch-all notes |

Quick-add (the flow users will actually use most) asks for **name only**.

### Against our planned schema

| Our planned field | KinTree has it? | Verdict for us |
|---|---|---|
| họ / tên đệm / tên separately | **No** — one combined field | **We should split.** Enables sort-by-họ, chi/phái grouping, and "Chỉ tên" display without string guessing. KinTree's `Định dạng tên` toggle has to *parse* the single string — brittle |
| Bilingual VI–EN names | **No** | Keep; low cost, real value for diaspora families |
| Nickname / tên thường gọi | **No** | Keep — Vietnamese families overwhelmingly use tên thường gọi |
| Gender | Yes (Nam/Nữ) | Match. Their auto-infer-from-slot trick is worth copying |
| Birth date — solar | Yes | Match |
| Birth date — lunar / Can Chi | **Lunar yes** (toggle). Can Chi shown in the Lịch tab, **not** stored per person | We should do both: store lunar and *derive* Can Chi for display |
| Death date | Yes (conditional) | Match — and copy the conditional reveal |
| Ngày giỗ | Partially — death date can be entered as âm lịch, which is effectively ngày giỗ | We should model ngày giỗ explicitly (giỗ can differ from date of death, and giỗ recurrence is lunar) |
| Alive / deceased | Yes | Match |
| Avatar | Yes | Match |
| Phone (+84) | Yes, unvalidated | We can do better cheaply |
| Facebook / Zalo | **No** | Keep — this is how living VN relatives actually connect |
| Email | **No** | Low priority |
| Address | Yes (free text) | Match |
| Map location | **No** | Optional; a plain lat/lng + static link is achievable client-side |
| Occupation | Partial ("Nơi làm việc" = workplace) | Keep occupation separate from workplace |
| Notes | Yes | Match |
| Burial location | **Yes** ("Địa điểm an táng") | Confirms the field earns its place. Copy |
| Biological vs adopted vs con rể / con dâu | **No — none.** No adoption flag, no in-law typing beyond spouse | **Our differentiator.** See Reproduced Bugs / Ideas |
| **Birth order (con cả / thứ / út)** | **No explicit field** | **Our differentiator.** See below — this is the big one |

---

## Tree Canvas & Interaction Teardown

**Layout model.** Strict generation bands, top-down. Each person carries a `♂/♀ Đời N` badge and generations
**auto-renumber** when an ancestor is inserted: adding a father above `Me` moved Me from Đời 1 → Đời 2, and
adding a grandfather pushed it to Đời 3 (observed across `q5` → `r04`). Couples sit side by side in the same
band, horizontally centred over their child (`Ong` at x 90-600 and `Ba` at x 600-1110, with `Cha` centred at
345-855 below).

**Node card design** (`s07.png`): landscape rectangle ~510x434 device px, thin dark-red border with
**Vietnamese/Chinese fret (hồi văn) corner motifs**, cream fill, circular avatar on the left, name to the
right, generation badge notched into the top-right edge. It reads like a wooden ancestral tablet. Deceased
rendering was **not** confirmed — I set a record to "Đã mất" only long enough to read the revealed fields and
reverted it before returning to the canvas.

**Multi-spouse (đa thê): properly supported.** After `Me` had one wife, re-opening the picker showed a *second*
`＋ Vợ/Chồng` slot on the opposite side **and two separate `＋ Con` slots** — one per spouse union
(`r06.png`: `＋, Con` at x 0-300 and x 450-750). So children are attached to a specific union, not to the
individual. That is the correct data model and it is what we should build.

**Gestures.** Pan and pinch-zoom on the canvas, plus an explicit floating toolbar (center-on-me, zoom in,
zoom out, reset) — belt-and-braces for users who do not discover pinch. Tap a node → action sheet. There is
**no visible add-person FAB on the tree**; adding always goes through a node. Clean conceptually, but a new
user with one node has to guess.

**Large trees.** Untested at scale (my tree reached 5 people). No collapse/expand affordance, no minimap, no
search-on-canvas was visible. The mitigations they do ship are: re-root ("Xem cây của X"), center-on-me,
zoom-out, and the name-format/font-size settings. **Inference:** with strict generation bands and no
collapsing, a 300+ person tree will be very wide; re-rooting is their answer to that.

**Kinship terms ("xưng hô") — computed, root-relative.** Node cards render *name + kinship term* ("Cha",
"Ông nội", "Bà nội", "Vợ"), and the Quan hệ tab lists relatives grouped by category with the term
("Ông nội", "Tôi"). The bundle contains a full term vocabulary with proper **nội/ngoại** distinction:
`Ông/Bà bác/cô (nội)`, `Bà bác/dì (ngoại)`, `Cháu nội/ngoại (trai)/(gái)`, `Cháu họ (trai)/(gái)`,
`Chắt (trai)/(gái)`, `Chút (trai)/(gái)`, `Anh/Em họ (trai)`, `Chị/Em họ (gái)`, `Anh rể`, `Chị dâu`,
`Con dâu`, `Bác (trai)/(gái)`, `Thím`, `Cha dượng`, `Cha/mẹ còn lại`, `Họ hàng bề trên`,
`Không có quan hệ trực tiếp`. **No Bắc/Trung/Nam regional dialect setting was found** in Giao diện.

---

## Monetization & Premium Tiering

**Partial — the price screen is behind the login wall.** Tapping Premium (Settings → "Premium Gia Đình PRO")
lands on `Cần đăng nhập / Đăng nhập để mua Premium Gia Đình.` (`p03.png`, `p04.png`). RevenueCat supplies
prices at runtime, so **no VND price point could be captured**. The post-onboarding carousel (6 pages) was
dismissed on first run and never re-appeared — pages 2–6 unseen on screen. What follows is page 1 as observed
plus benefit strings recovered verbatim from the Hermes bundle.

Product is branded **"Premium Gia Đình"** — a *family* subscription, not per-seat: "cho mọi thành viên",
"Nâng Cấp Gia Đình".

### Verbatim benefit copy

Observed on screen (`s06.png`):
- Heading: "Làm gia phả đẹp hơn"
- Subhead: "Nâng cấp gia đình để mở khoá đồng bộ đám mây, chat AI, bảng tin gia đình và nhiều hơn — cho mọi thành viên."
- Carousel page 1: "**200 tin nhắn AI mỗi ngày**" / "Hỏi trợ lý AI gia đình bất cứ điều gì — từ công thức nấu ăn đến lịch sử gia đình."
- CTAs: "Xem gói nâng cấp" / "Để sau"

Recovered from the bundle (benefit title → description):
- "**Đồng bộ & sao lưu đám mây**" → "Giữ gia phả an toàn với sao lưu và đồng bộ trên mọi thiết bị."
- "**Lưu trữ ảnh vĩnh viễn**" → "Tải lên và lưu trữ ảnh gia đình vĩnh viễn trên đám mây."
- "**Bảng tin, bài viết & sự kiện**" → "Chia sẻ cập nhật, ảnh và lên kế hoạch sự kiện gia đình."
- "Mở khoá toàn bộ sức mạnh Kintree cho cả gia đình — tin nhắn AI không giới hạn, đồng bộ đám mây và lưu trữ vĩnh viễn cho mọi người."
- "Chia sẻ gia phả lên web" / "Chia sẻ đường dẫn gia phả" / "Chia sẻ trang web"
- Post-purchase: "Chào mừng Premium Gia Đình!", "Gia đình bạn đã là Premium!", "Gia đình bạn đã có toàn quyền truy cập tất cả tính năng cao cấp. Tận hưởng chat AI không giới hạn, đồng bộ đám mây và nhiều hơn nữa — cho mọi thành viên."

### Free-tier limits (verbatim)

- "**Gia đình này đã đạt tối đa 5 thành viên.**" / "Gia đình đã đầy" → **5 accounts per family group.**
- "**Bạn đã dùng hết tin nhắn miễn phí hôm nay. Nâng cấp Premium để có 200 tin nhắn mỗi ngày.**" /
  "Đã hết giới hạn tin nhắn hôm nay" → free tier gets a small unspecified daily AI allowance.
- "Nâng cấp lên Premium để sử dụng tính năng bảng tin gia đình." → feed is fully paid.
- "Bạn cần tải dữ liệu lên ít nhất một lần trước khi sử dụng tính năng gia đình." → sharing requires a cloud upload first.
- "Chia sẻ liên kết này để mời mọi người vào gia đình. **Có hiệu lực trong 7 ngày.**"
- "Bạn có thể đồng bộ lại sau {{time}}." → sync is rate-limited.

**No person cap, no tree cap, no export watermark, and no ads were found.** Export/import and all
Vietnamese cultural content (76 văn khấn, lịch vạn niên) are **free and offline**.

### Billing plumbing and plan shapes

RevenueCat + Google Play Billing (`com.android.vending.BILLING`), Stripe web checkout as an alternate rail,
Amazon IAP receiver present-but-unused. Plan-shape labels in the bundle: "Hàng tháng", "Hàng năm",
"trọn đời", "trả một lần", a "ƯU ĐÃI NHẤT" (best-value) badge, plus free-trial machinery
("Bắt đầu dùng thử", "Dùng thử miễn phí", "Sau khi thời gian dùng thử kết thúc… bạn sẽ bị tính phí {{price}}").
So: **monthly + yearly + lifetime, with a trial.** Amounts unknown.

### What the gating tells us about willingness to pay

Everything paid is a **server cost** (cloud sync, permanent photo hosting, LLM inference, the social feed) or
**multi-user coordination** (5-member family group, invite links, web publishing). Everything that is pure
*content or computation* — the almanac, 76 văn khấn, kinship-term calculation, the tree itself, export — is
free. That is a rational line for a company paying for servers, and it tells us the Vietnamese buyer is being
asked to pay for **(a) not losing the data, (b) sharing it with relatives, (c) AI**.

### Implications for us

We have no backend, and that is the wedge: **three of their four premium pillars are things we can give away
for free using the user's own Google account.**

| Their premium feature | Can we deliver it free? | How |
|---|---|---|
| Đồng bộ & sao lưu đám mây | **Yes** | SQLite file in the user's Google Drive (appDataFolder or a visible folder). Their cost centre is our zero-cost feature |
| Lưu trữ ảnh vĩnh viễn | **Yes** | Photos as Drive files referenced by ID; the user's own 15 GB. "Vĩnh viễn" is literally true because they own it |
| Chia sẻ gia phả / mời thành viên (5-member cap) | **Mostly** | Drive share the DB file / folder to specific accounts. No 5-person cap — Drive sharing has no such limit. Last-writer-wins or CRDT-ish merge is the hard part, not the transport |
| Bảng tin gia đình (social feed) | **Partly** | A comment/post table inside the shared DB gives async family notes. Real-time push, notifications, and moderation we genuinely cannot do without a server |
| 200 AI messages/day | **No** (not free) | We cannot host inference. Options: bring-your-own API key, or skip it. Note their own consent text admits third-party processing: "Bằng cách gửi tin nhắn cho Trợ lý AI, bạn đồng ý chia sẻ dữ liệu cuộc trò chuyện với hệ thống AI… có thể được xử lý bởi dịch vụ AI của bên thứ ba." For a privacy-first product, **declining to ship this is a feature**, and we should say so out loud |
| Chia sẻ gia phả lên web | **No** | Needs hosting. A static HTML export the user can host/share as a file is the achievable substitute |

Positioning: *everything KinTree charges for to keep your data safe, we give you for free — in your own Drive,
where we cannot read it.*

---

## Feature Test Matrix

| Feature | Reachable? | Works? | Evidence | Our takeaway |
|---|---|---|---|---|
| Language choice at first launch | Yes | Yes | `s01.png` | Copy — ask before anything else |
| Font family / size / name-format / age-format in onboarding | Yes | Yes | `s02.png` | **Copy.** Pre-empts name overflow |
| 7 colour themes incl. "Cổ phong" default | Yes | Yes | `g02.png` | Copy the *idea* of a Vietnamese-classical default theme |
| Notification opt-in with no skip | Yes | Yes (dark pattern) | `s04.png` | **Avoid.** Always offer skip |
| Works with zero permissions granted | Yes | Yes | all runtime perms denied throughout | Copy — degrade gracefully |
| No forced signup; app usable immediately | Yes | Yes | `s07.png` | **Copy.** Strong |
| Tree canvas render + generation badges | Yes | Yes | `s07.png`, `r04.png` | Copy `Đời N` badge |
| Generation auto-renumber on ancestor insert | Yes | Yes | `q5` → `r04` | Copy |
| Spatial "＋" relationship picker | Yes | Yes | `s10.png`, `r06.png` | **Copy — best idea in the app** |
| One-field quick add | Yes | Yes | `q1.xml` | **Copy** |
| Add father | Yes | Yes | `q5`, `r04.png` | — |
| Add grandfather (3 generations) | Yes | Yes | `r04.png` | Ancestor-blanking bug **did not reproduce** |
| Add grandmother (couple in top band) | Yes | Yes — renders as "Bà nội" beside Ong | `r04.png` | Ancestor-blanking bug **did not reproduce** |
| Great-grandmother (4th generation) | Yes | **Not tested** | — | Deferred |
| Add spouse | Yes | Yes ("♀ Đời 3, Vo, Vợ") | `r05.png` | — |
| **Second spouse slot (đa thê)** | Yes | **Yes — offered** | `r06.png` | Model confirmed viable |
| **Per-spouse child slots** | Yes | **Yes — two separate `＋ Con`** | `r06.png` | **Copy this data model** |
| Children actually assigned to wife 2 | Yes | **Not tested** (ran out of scope) | — | **Deferred — this is the reported break** |
| Sibling slot (→ aunts/uncles) | Yes — appears once a parent exists | **Not populated/tested** | `r01` dump | **Deferred — canvas rendering unverified** |
| Aunt/uncle rendering on canvas | — | **Unknown** | — | Deferred |
| Re-root ("Xem cây của X") | Yes (menu item present) | **Not exercised** | `s08.png` | Deferred — reported to blank |
| Kinship term on node card + Quan hệ tab | Yes | Yes ("Cha", "Ông nội", "Bà nội", "Vợ", "Tôi") | `r04.png`, `k01.png` | Copy; go further (see below) |
| Regional (Bắc/Trung/Nam) kinship setting | — | **Not present** in Giao diện | `g01.png` | **Our differentiator** |
| **Explicit birth order (con cả/thứ/út)** | — | **Not present** in any form | `p11.png`, `q1.xml` | **Our differentiator** |
| **Adopted / bố-mẹ nuôi** | — | **Not present**; no adoption flag anywhere | field inventory | **Our differentiator** |
| **Con dâu / con rể typing** | — | **Not present** beyond generic spouse | field inventory | **Our differentiator** |
| Birth date lunar/solar toggle | Yes | Yes | `p13.png` | **Copy** |
| Death date lunar/solar toggle | Yes | Yes | `p16.xml` | **Copy** |
| Conditional death fields (ngày mất + an táng) | Yes | Yes | `p15.png` | Copy the conditional reveal |
| Deceased card rendering on canvas | — | **Not verified** (reverted before viewing canvas) | — | Deferred |
| Lịch vạn niên (âm lịch, Can Chi, giờ hoàng đạo, tiết khí, trực) | Yes | Yes, offline | `c01.png` | **Copy — high value, pure computation** |
| Calendar event add ("+" FAB) | Yes | **Not tested** | `c01.png` | Deferred |
| Văn khấn library (76 bài, search, categories) | Yes | Yes, offline | `v01.png` | **Copy the concept** |
| Văn khấn fill-in fields + per-field save | Yes | Yes (not filled — personal data) | `v02.png` | Copy; keep values local |
| Văn khấn teleprompter + auto-scroll speeds | Yes | Yes (Chậm/Vừa/Nhanh/Rất nhanh) | `v03.png`, `v04.png` | **Copy** |
| Export | Yes, free, no login | Yes — `kintree-export-<ISO>.json` via share sheet | `p06.png` | Copy: export must never be paywalled |
| **GEDCOM (.ged) export** | — | **Not offered** on the export screen | `p05.png`, `p06.png` | **Our differentiator** |
| **PDF / image export for printing** | — | **Not offered** on the export screen. Bundle does contain "Hiển thị gia phả để in hoặc xuất PDF" | `p05.png` | Unresolved — string suggests it exists somewhere I did not reach |
| Import from file | Yes | **Not tested** (would need a file) | `p05.png` | Deferred |
| Đặt lại cây (wipe) | Yes | Not exercised (destructive) | `p05.png` | — |
| Landscape orientation | **No** | `app.config`: `"orientation":"portrait"` | — | We get responsive/landscape free on web |
| Login | Yes | **blocked: login** — Google-only; user's own attempt errored | `q8.png` | Copy skippability; offer more than one provider |
| Premium price/plan screen | **blocked: login** | — | `p03.png` | **Deferred** |
| Trợ lý AI | **blocked: login** | — | `p07.png` | Server-dependent; likely out of scope for us |
| Bảng tin (feed) | **blocked: login** | — | `p08.png` | **Deferred** |
| Gia đình / invites / 5-member cap | **blocked: login** | — | `p02.png` | **Deferred** |
| Cloud sync + conflict resolution | **blocked: login** | — | strings only: "Dùng dữ liệu đám mây" / "Ghi đè đám mây" | **Deferred — directly relevant to our Drive sync** |
| Photo upload to cloud | **blocked: login/premium** | — | — | Deferred |
| Web publishing of tree | **blocked: login/premium** | — | strings only | Deferred |
| Paywall carousel pages 2–6 | **blocked: show-once** | — | `s06.png` (page 1 only) | Deferred |

---

## Reproduced Bugs

Honest result: **I did not reproduce any of the reported defects**, and I did not reach the flows where two of
them live. Recording this precisely so nobody mistakes absence of evidence for evidence of absence.

1. **Ancestor-blanking (grandmother / great-grandmother) — DID NOT REPRODUCE (3 generations).**
   Steps: root `Me` → add Cha → add Ong (Cha's father) → add Ba (Cha's mother). After each insert the canvas
   rendered all nodes with correct generation bands and correct terms (`♂ Đời 1, Ong, Ông nội`;
   `♀ Đời 1, Ba, Bà nội`; `♂ Đời 2, Cha, Cha`; `♂ Đời 3, Me`). Evidence `r04.png`.
   **Not tested at 4+ generations** (great-grandmother), which is where the report placed it.

2. **Multi-spouse child assignment — NOT TESTED.** The *slots* are correct (two independent `＋ Con`, one per
   union, `r06.png`), but I did not create wife 2 or attach children, so the reported break is unverified.

3. **False alarm worth recording:** at one point the canvas dump came back empty and looked like a blanking
   bug — it was **my own extra back-press exiting KinTree to the launcher** (`r03.png` is the phone's home
   screen). Not an app defect.

4. **Minor real oddity:** tapping "Bỏ qua" (skip) on the login screen once showed "Logging in…" and then
   returned to the login screen instead of proceeding; a second attempt worked and landed on the Lịch tab.
   Possibly a failed anonymous-auth attempt. Low confidence, one occurrence.

5. **Not a bug, but a data-model consequence to note:** with the default `Định dạng tên = Tên và tên đệm`, the
   person I created as "Vo Mot" renders on the canvas as "**Vo**". Deriving display names by parsing one
   combined string is lossy — direct support for splitting họ / tên đệm / tên in our schema.

### Environment note (not an app bug)

The device's Vietnamese **Telex IME rewrites ASCII input from `adb shell input text`** — "Test" became "Tét"
(`es` → `é`). Any future automation must use Telex-safe placeholder names (avoid `s f r x j w`, doubled
vowels, `dd` after vowels) or switch IME. I used "Cha", "Ong", "Ba", "Vo Mot".

---

## Ideas To Adopt

Prioritised. Every one is achievable client-side with SQLite-in-browser + Google Drive — no server.

**P0 — copy almost as-is**

1. **Spatial "＋" relationship picker.** Show a mini family diagram with dashed "+" circles in the correct
   positions (cha/mẹ above, vợ/chồng beside, con below, anh chị em lateral) instead of a "relationship type"
   dropdown. Zero ambiguity, no Vietnamese kinship vocabulary required from the user, and it makes the
   *shape* of the data obvious. Pure UI — trivially a React component on our canvas.
2. **One-field quick add, enrich later.** "Thêm Cha / Cho Me" + name + Tạo. A user building a 60-person tree
   will abandon an 11-field form 60 times. Our full form stays, but the default path is one field.
   Directly reduces the cost of our richer schema.
3. **Lunar/solar toggle inside the date picker itself**, plus manual text entry, for *both* birth and death.
   Not a separate "lunar date" field — the same field, two input modes, with the solar↔lunar conversion done
   locally. We already need a lunar library; this is the right UI for it.
4. **Name-format + font-size settings, surfaced during onboarding.** `Tên đầy đủ / Tên và tên đệm / Chỉ tên`
   and four text sizes. This is the cheapest possible fix for Vietnamese names overflowing tree nodes, and
   the large sizes are an accessibility win for the elders who care most about gia phả. Because we will store
   họ / tên đệm / tên separately, our version is *more* accurate than theirs.
5. **`Đời N` generation badge + auto-renumbering** when an ancestor is inserted above the root.

**P1 — copy with a deliberate improvement**

6. **Computed kinship terms ("gọi là gì") on the card and in a relationships list**, with correct nội/ngoại
   distinction. KinTree computes root-relative terms only. We should go further in two ways:
   (a) **pair-relative** terms ("X gọi Y là gì?" for any two people), and (b) derive seniority
   **recursively from the parents' birth order**, not from the two cousins' own ages — the rule KinTree
   reportedly gets wrong. Which brings us to:
7. **Explicit birth order (`con cả` / `con thứ N` / `con út`) as a stored field, not an inference from birth
   year.** This is the single highest-leverage schema decision in this report. Vietnamese kinship terms
   between cousins are determined by the *parents'* seniority, recursively — so `anh họ` / `em họ` cannot be
   computed from the cousins' own birth years. Many older records have no birth year at all, only order.
   KinTree has no such field and therefore cannot be correct. Cheap for us, and it is a correctness claim we
   can defend publicly.
8. **Lịch vạn niên panel**: âm lịch date, Can Chi for year/month/day, tiết khí, trực, day quality, and
   giờ hoàng đạo. All pure computation, all offline, all client-side — a natural fit for a local-first PWA,
   and it makes the app a daily-use utility rather than a once-a-year data-entry chore.
9. **Regional kinship dialect setting (Bắc / Trung / Nam).** KinTree has no such option. Cô/dì/bác/chú/thím
   usage varies materially by region, and getting it wrong is exactly the kind of thing that makes a
   Vietnamese user distrust the whole app. A lookup-table swap for us; a credible differentiator.
10. **Per-union children (đa thê done right).** Attach children to a (parent, spouse) union rather than to an
    individual, so multiple wives and their respective children are unambiguous. KinTree's slots already show
    this shape; we should implement it deliberately and test it, since that is reportedly where they break.
11. **Conditional death block**: choosing `Đã mất` reveals ngày mất + địa điểm an táng. Keeps the form short
    for the living. We should add **ngày giỗ as its own lunar recurring date**, since giỗ is what families
    actually act on and it need not equal the date of death.

**P2 — content and polish**

12. **Văn khấn library as fill-in templates with a teleprompter.** The template variables (`{tin_chu}`,
    `{ngu_tai}`, `{nguoi_mat}`, `{ho_toc}`, `{dia_chi}`, `{ngay_thang_nam}`) auto-fill from the tree and the
    current lunar date — a genuinely clever tie-in between the genealogy data and daily ritual use. The
    teleprompter (dark background, huge colour-coded type, Chậm/Vừa/Nhanh/Rất nhanh auto-scroll) is designed
    for someone standing at an altar holding a phone. All static content + CSS for us. **Caveat:** 76 texts is
    a real content-authoring effort and we must use properly-licensed/public-domain sources.
13. **Export never paywalled**, one tap, timestamped filename, straight to the OS share sheet. Ours should
    additionally offer **GEDCOM** (which KinTree does not) and a **print/PDF** view — GEDCOM is our
    "your data is never hostage" proof, and printing a gia phả for the nhà thờ họ is a real Vietnamese use case.
14. **A Vietnamese-classical default theme** ("Cổ phong": cream ground, dark-red ink, hồi văn corner motifs,
    folk-art illustrations) instead of generic material blue. Their visual identity is the most convincing
    thing about the product and costs us only CSS.
15. **Zero-permission operation.** Every runtime permission was denied on my device for the entire session and
    nothing broke. A PWA gets this mostly by default; we should make it an explicit promise.
16. **Re-rooting ("xem cây từ góc nhìn của người này") + center-on-me + zoom controls as visible buttons**
    alongside pinch/pan. Cheap large-tree mitigation and discoverable for non-technical users.

---

## Anti-Patterns To Avoid

1. **Paywall before first value.** A 6-page upgrade carousel fires immediately after onboarding, before the
   user has entered one relative (`s06.png`). We should not show any monetisation until the user has a tree
   worth keeping.
2. **Notification prompt with no skip.** Onboarding step 4 offers only "Bật Thông Báo" (`s04.png`). Always
   provide "Để sau".
3. **Cloud-only durability, sold back to the user.** Backup/sync is the headline paid feature — the free tier
   is local-only by omission, not by design, so the honest reading is "pay us or risk losing your gia phả".
   Our entire premise is the opposite: durable by default, in storage the user already owns.
4. **Single-provider login (Google only) required for a large share of the app.** AI, feed, family sharing,
   sync and *even viewing prices* are all behind one OAuth provider (`p03`, `p07`, `p08`). And it is fragile:
   the user's own login attempt errored out. Any account we ever require must be optional and multi-path.
5. **Arbitrary social cap as a monetisation lever** — "Gia đình này đã đạt tối đa 5 thành viên." Capping how
   many relatives may see the family tree is a poor fit for Vietnamese extended families.
6. **Third-party AI processing of family data**, disclosed only in a consent blurb
   ("dữ liệu … có thể được xử lý bởi dịch vụ AI của bên thứ ba"). For a privacy-first product, not shipping
   this is a positioning asset.
7. **Permissions beyond the feature set:** `RECORD_AUDIO` and `SYSTEM_ALERT_WINDOW` with no visible
   corresponding feature, plus advertising-ID permissions and `expo-tracking-transparency` copy that promises
   "personalized ads" while no ad SDK is present. Ask for nothing we do not currently use.
8. **Secrets in the shipped artifact.** The release keystore passwords are readable in `assets/app.config`
   inside the APK. Our build must keep signing/config secrets out of client bundles — worth an explicit CI check.
9. **Single combined name field** in a Vietnamese app, then trying to *derive* "Tên và tên đệm" from it by
   parsing. Lossy (my "Vo Mot" rendered as "Vo") and it blocks sorting/grouping by họ.
10. **No adoption, no con dâu/con rể, no birth order.** Three modelling gaps that Vietnamese families hit
    immediately. Cheap to model correctly if done before launch, painful to retrofit.
11. **OTA JS updates from a private endpoint** (`kintree-updater.creaton.dev/api/check-update`) — ships code
    outside the store review path. A PWA updates transparently via service worker; no need to imitate.
12. **No landscape support** (`"orientation":"portrait"`), which hurts exactly the wide-tree case.

---

## Vietnamese / Cultural Support

KinTree is not a translated Western genealogy app — it is built for Vietnam. This is its real moat and we
should assume it sets the floor, not the ceiling.

| Aspect | Support | Detail |
|---|---|---|
| **Âm lịch (lunar)** | **Strong** | Dương lịch/Âm lịch toggle in both birth and death pickers (`p13.png`, `p16.xml`); Lịch tab shows the lunar day/month ("9 Tháng Bảy"); leap months handled — bundle contains "tháng nhuận", "Họ hàng bề trên (nhuận)" |
| **Can Chi** | **Yes, for dates** | Lịch tab shows Năm Bính Ngọ / Tháng Bính Thân / Ngày Đinh Mão (`c01.png`). **Not** stored as a per-person attribute |
| **Tiết khí (24 solar terms)** | Yes | "Lập Thu" shown on the day card; bundle has Bạch Lộ, Lập Hạ, etc. |
| **Giờ hoàng đạo** | Yes | Six auspicious hour ranges per day (`c01.png`) |
| **Day quality / trực** | Yes | "Tốt", "Trực Mãn"; bundle has "ngày trung bình", "nên thận trọng, hạn chế việc lớn", "ngày tốt cho các việc quan trọng" |
| **Ngày giỗ** | **Partial** | No dedicated field; achieved indirectly by entering the death date as âm lịch. Bundle covers the full mourning calendar: "Chung Thất (49 ngày) và Tốt Khốc (100 ngày)", "Bách nhật", "Giỗ Hết", "Cải cát" (bốc mộ), "Thượng thọ" |
| **Danh xưng / xưng hô** | **Yes, computed** | Root-relative terms on cards and in the Quan hệ tab, with correct nội/ngoại: `Ông nội`, `Bà nội`, `Cháu nội/ngoại (trai)/(gái)`, `Chắt`, `Chút`, `Anh/Em họ`, `Anh rể`, `Chị dâu`, `Con dâu`, `Bác (trai)/(gái)`, `Thím`, `Cha dượng`, `Họ hàng bề trên`. **No Bắc/Trung/Nam regional option.** Seniority logic unverified — the reported cousin-seniority defect is plausible but I did not test it |
| **Đa thê (multiple spouses)** | **Yes, structurally** | Second spouse slot + per-union child slots (`r06.png`). Actual multi-wife child assignment untested |
| **Văn khấn** | **Exceptional** | 76 scripts, searchable, categorised (Tín ngưỡng - Lễ hội, Cầu tự, Tết Trung Nguyên, Dâng sao giải hạn…), as fill-in templates with a read-aloud teleprompter. Covers dâng sao giải hạn per star (La Hầu day 8, Thái Bạch day 15, Kế Đô day 18, Thổ Tú 19, Thủy Diệu 21, Mộc Đức 25, Thái Âm 26, Thái Dương 27, Vân Hán 29), Rằm tháng Bảy / Vu Lan, Giao Thừa, Tết Đoan Ngọ, Chúc Thực, Hồi Linh, Cải cát, and more |
| **Vietnamese holidays** | Yes | Bundle includes Chiến thắng Điện Biên Phủ, Tết, Rằm tháng 7/8, "Chiều 30 Tết", "23 tháng chạp", plus Ngày của Cha/Cha dượng |
| **Language / localisation** | Yes | VI + EN chosen at first launch, switchable in Giao diện; a dedicated `config.vi` resource split ships in the APK. RevenueCat paywall strings are localised into ~15 languages, but the app UI itself is VI/EN |
| **Visual culture** | **Exceptional** | Default "Cổ phong" theme; hồi văn fret motifs framing node cards; folk-art illustrations (Thánh Gióng, bamboo, đình/temple, family meal, ancestral altar) |
| **Adoption (con nuôi), con dâu / con rể typing, birth order** | **Absent** | No field, flag, or option found anywhere. Our clearest schema-level opening |

---

## Deferred — To Test After Login

Priority order for the next session. The phone was left with KinTree force-stopped, data intact.

1. **Premium plan/price screen** — Settings → "Premium Gia Đình PRO" once signed in. Capture verbatim plan
   names, **VND prices**, billing periods (monthly / yearly / lifetime), trial length, "ƯU ĐÃI NHẤT" framing,
   and the full free-vs-premium comparison list. *This is the biggest remaining gap.*
2. **Paywall carousel pages 2–6** — appears post-onboarding and seems show-once. May re-trigger via
   "Xem gói nâng cấp" after login.
3. **Multi-spouse child assignment (the reported break)** — add wife 2 to `Me`, then add children under each
   wife via the two separate `＋ Con` slots, and verify each child lands under the correct union on the canvas.
   *Highest-value correctness test for our own data model; needs no login — just was not reached.*
4. **Birth-order / cousin-seniority correctness** — reproduce the reported case: mẹ b.1948, dì b.1953, dì's
   daughter older than ego. Check whether KinTree reports `em họ` (correct, recursive from parents) or
   `anh/chị họ` (wrong, from the cousins' own ages). No login needed.
5. **Aunts/uncles on canvas** — populate `＋ Anh chị em` on `Cha` and confirm whether they render on the tree
   or only in the Quan hệ tab. No login needed.
6. **4+ generation ancestors** — add great-grandmother/great-grandfather and re-check for the reported
   blanking. No login needed.
7. **Re-root ("Xem cây của X")** — exercise it and check for the reported blank-tree-needing-reset. No login needed.
8. **Deceased card rendering** — set a person to `Đã mất` and inspect the canvas card (faded? symbol? death
   year? giỗ?). No login needed.
9. **Cloud sync + conflict resolution** — trigger a sync conflict and capture the "Dùng dữ liệu đám mây" vs
   "Ghi đè đám mây" dialog. *Directly informs our Google Drive merge design.*
10. **Family sharing** — invite flow, 7-day invite link, and the 5-member cap message in situ.
11. **Bảng tin (feed)** — post/photo/event composer.
12. **Trợ lý AI** — ask it a kinship question ("X gọi Y là gì?") and a tree-mutation request
    ("thêm em trai cho…"); capture the free-tier daily message allowance and confirm it is server-side.
13. **Import** — feed it a KinTree JSON export and check whether the importer also accepts **GEDCOM**.
14. **PDF/print export** — the bundle contains "Hiển thị gia phả để in hoặc xuất PDF" but the Dữ liệu screen
    offers only JSON. Find where that lives.
15. **Photo upload** — per-person avatar to cloud; check whether it is premium-gated and how originals are stored.
16. **Web publishing** — "Chia sẻ gia phả lên web" / "Chia sẻ đường dẫn gia phả": is the published tree public,
    unlisted, or access-controlled?
17. **Calendar "+" FAB** — event creation, and whether it writes to the device calendar
    (`READ/WRITE_CALENDAR` + `expo-calendar` are declared).
18. **Scale test** — import or generate a 300+ person tree and observe canvas performance, layout width, and
    whether any collapse/minimap affordance appears.

---

## Unresolved Questions

1. **VND price points and the exact free-vs-premium table** — unreachable pre-login. Blocks any pricing
   comparison.
2. **Does KinTree compute cousin seniority recursively from parents' birth order, or from the cousins' own
   ages?** Untested. If it is age-based it is wrong, and correctness here is a defensible differentiator for us.
3. **How does the tree behave at 300+ people?** No collapse/expand or minimap was visible. Unknown whether
   strict generation bands become unusable, and unknown what their render budget is (Hermes + Reanimated on a
   mid-range phone vs our sql.js + DOM/SVG in a browser).
4. **How are children stored relative to unions?** The UI *presents* per-union child slots; whether the
   underlying model is a union entity or a (father_id, mother_id) pair is unverified. A JSON export from a
   multi-spouse tree would answer this and inform our schema directly — worth doing next session.
5. **Is there any person/tree count limit on the free tier?** None found in strings, but not proven.
6. **What is the free-tier daily AI message allowance?** Only "Bạn đã dùng hết tin nhắn miễn phí hôm nay"
   was found; the number is server-side.
7. **Where does "Hiển thị gia phả để in hoặc xuất PDF" surface?** The string exists; the Dữ liệu screen
   offers JSON only.
8. **Why `RECORD_AUDIO` and `SYSTEM_ALERT_WINDOW`?** No corresponding feature found. Possibly planned
   (voice notes for family stories?) or leftover from a dependency.
9. **Will they add ads?** Ad-ID permissions and "personalized ads" consent copy are present with no ad SDK.
10. **Licensing of the 76 văn khấn texts.** These are largely traditional/public-domain liturgy, but the
    specific compilation may be copied from an existing published collection. If we ship a similar library we
    need our own sourcing, and we must not copy their compilation.
11. **JSON export schema** — I saw only the filename (`kintree-export-<ISO>.json`); the file was never opened
    (it went straight to the share sheet, which showed the user's personal contacts, so I closed it). Reading
    one would tell us their full data model, including whether adoption/birth-order fields exist but are
    unexposed in the UI.
