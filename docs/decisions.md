# Quyết định

> Đây là nguồn chân lý về **vì sao** dự án đi hướng này. Mỗi mục có: quyết định · lý do · bằng chứng · trạng thái.
> Bằng chứng nằm ở `plans/reports/`. `docs/` khẳng định, `plans/reports/` chứng minh.
> Phiên gốc: 2026-08-21 → 22.

Nguồn: research 5 link FB (~700 comments) + 4 code review có codex cross-review + codex phản biện research.
File liên quan: `plans/reports/fb-research/*`, `plans/reports/reviewer-260821-2312-*`.

## D1 — Vision: GIỮ NGUYÊN (user chốt)
Local-first PWA · privacy-first · zero-setup · dữ liệu ở Google Drive của chính user · KHÔNG backend server.
Chỉ tối ưu execution trong vision này. Không xét lại pivot sang backend/native.

**Bằng chứng thị trường hậu thuẫn:** comment top post AncestorTree (23 like) "lưu trên đám mây tập trung của bạn thì không mấy ai muốn dùng" → tác giả buộc ra bản Local & Desktop · hyhon.io.vn sập vì VPS hết hạn · giapha-os bị Supabase khoá project sau 7 ngày không dùng · rất nhiều user không tự cài nổi Supabase/Vercel.

## D2 — V1 chỉ phục vụ 1 người dùng (user chốt)
V1 làm cho chính chủ dự án dùng. Cộng tác nhiều người KHÔNG thuộc scope v1.

**Cắt khỏi v1:** phân quyền/role · workflow đề xuất-duyệt · audit log · merge/conflict UI · change journal append-only · event sourcing · CRDT · share link · notify cả họ.

**KHÔNG cắt (là yêu cầu đúng đắn dữ liệu, không phải cộng tác):** `union` / `parentage` first-class — xem D3.

**Thay cho change journal:** ghi có transaction + snapshot có version lên Drive (giữ N bản gần nhất) + export/import lossless. Đủ restore + undo thô, đơn giản hơn event sourcing nhiều.

**Giả định đã ghi (chưa cần user xác nhận lại):** "1 người" vẫn có thể 2 thiết bị (desktop nhập hàng loạt, điện thoại tra cứu khi về quê). Drive sync vẫn cần etag/revision precondition + phát hiện xung đột, nhưng KHÔNG cần UI merge — bản mới thắng, bản cũ giữ thành version. Nếu chỉ dùng đúng 1 máy thì cắt luôn phần này.

**Lên mức cộng tác cao hơn:** mức 2 (gửi patch tay qua Zalo, chủ gia phả duyệt & import) là mục tiêu v2 nếu cần. Mức 3 (Drive folder share + journal merge) để mở. Mức 4 (CRDT) loại khỏi scope.

## D3 — Data model: `union` là first-class entity
Bỏ mô hình person + relationship edge-list thuần.

```
persons
unions            (id, kind, status, start/end date, end_reason, notes)
union_partners    (union_id, person_id, role/order)
parentages        (child_id, parent_id, union_id nullable,
                   kind = biological | adoptive | step | guardian | claimed,
                   effective dates, confidence, source)
relationship_overrides (subject_id, object_id, preferred_label, reason)
```

Lý do (case cụ thể, không phải lý thuyết):
- `SPOUSE` không phân biệt đang cưới / ly hôn / **goá**. Vợ mất KHÔNG phải `EX_SPOUSE`.
- 3 bà vợ: "con của ông" không trả lời được "con của bà nào". Đây là request #1 lặp lại cả 5 post FB; kể cả app trả phí KinTree vẫn lỗi khi gán con cho bà thứ 2.
- **con dâu / con rể / cháu dâu là ĐƯỜNG DẪN suy ra, không phải loại người.** Lưu thành nhãn trực tiếp chính là nguyên nhân bug thật ở giapha-os: "con dâu hiển thị đúng nhưng cháu dâu thì sai".
- Nhận nuôi bởi cả hai vợ chồng vs chỉ một người — không suy được từ cặp spouse.
- Đa phu tạo đúng vấn đề ngược lại; giả định theo giới tính sẽ làm hỏng graph.
- **Hôn nhân cận huyết trong họ** → cây thành đồ thị có chu trình. Nhân bản người để giữ hình dạng cây sẽ tạo 2 tiểu sử xung đột.

→ Render một spanning tree cho dễ đọc, nhưng GIỮ cross-link, dedupe theo `person_id`, **không bao giờ clone người**.

## D4 — Ngày tháng: lưu đúng lịch mà gia đình khai
Bác bỏ công thức "ngày giỗ luôn lưu âm lịch". Invariant đúng: **lưu đúng giá trị + đúng loại lịch được khai**.
- Khai "mất 12 tháng 7 âm" → lưu âm. Có giấy chứng tử dương → lưu dương, không convert rồi coi âm là gốc.
- **Tách 2 sự kiện: ngày mất thật vs ngày giỗ gia đình cúng** (có thể lệch có chủ ý).
- Bắt buộc `is_leap_month`: tháng 4 và tháng 4 **nhuận** là hai ngày khác nhau. Giỗ gốc ở tháng nhuận thì năm không nhuận cần policy do user chọn — phần mềm KHÔNG được tự đoán.
- Bắt buộc `precision`: exact | month_only | year_only | approximate. Các cụ đời trên thường chỉ nhớ năm.
- Cần thư viện convert âm-dương **offline**, pin version, test năm biên + tháng nhuận. Ngoài khoảng hỗ trợ thì hiện ngày âm đã lưu và nói rõ "không convert được" — đoán tệ hơn là bỏ trống.

## D5 — Thứ tự con thuộc về union/parentage, không thuộc về person
`birth_order` để ở bảng `persons` là SAI. Con riêng, con nuôi, gia đình chắp nối, đa thê → "thứ mấy" khác nhau tuỳ đếm theo bà nào hay đếm chung cả nhà.
→ thứ tự con là contextual theo union/parentage + cho phép override thủ công.

Lý do phải có thứ tự nhập tay: **năm sinh THƯỜNG THIẾU ở các đời trên** — "tìm được người nhớ năm sinh anh/chị/em của ông bà nội ngoại chua lắm".

## D6 — Vai vế: đệ quy theo vai của cha/mẹ, không theo tuổi cá nhân
Bằng chứng đối thủ làm sai (KinTree, được user chứng minh công khai): app so theo tuổi → con của dì bị gán là "chị họ" vì lớn tuổi hơn, nhưng đúng phải là "em họ" vì dì là em của mẹ (mẹ SN 1948, dì SN 1953).

Quy tắc: vai anh/chị/em họ = đệ quy theo vai của cha/mẹ tương ứng. Chỉ dùng năm sinh khi vai cha mẹ bằng nhau hoặc là ruột cùng cha mẹ — và đây là **policy có override**, không phải luật cứng.

Engine phải trả về `{path, label, confidence, rule_used, override?}` và **trả "không xác định được" thay vì đoán**.

14 case quy tắc đệ quy KHÔNG đủ (chi tiết ở `plans/reports/fb-research/codex-cross-review.md` §3): mẹ và dì sinh đôi · không biết năm sinh cả hai · anh em cùng cha khác mẹ · con của các bà cùng lúc · con nuôi được coi là con cả · con riêng vào nhà chắp nối · vai cha mẹ bằng nhau/tranh chấp · cháu 60 tuổi vs chú 35 (vai đời thắng tuổi) · bác/chú/cô vs cậu/dì (cần biết bên nội/ngoại + giới tính) · chị dâu/em dâu suy từ vai người RUỘT không từ tuổi người dâu · cháu dâu ở độ sâu bất kỳ cần typed path · anh em họ lấy nhau (2 đường huyết thống + 1 đường hôn nhân) · chi/nhánh theo trưởng dòng khác với tuổi cha mẹ · thói quen từng vùng/từng nhà khác nhau.

## D7 — Tài liệu: migrate sang `plans/` + `docs/` (user chốt)
Chuyển `.plan/*.md` → `docs/` (evergreen: architecture, data model, UX, decisions) + `plans/` (roadmap, phases). Tạo `CLAUDE.md` + `AGENTS.md` ở root.

## D8 — Codegraph: hoãn (user chốt "tính sau")
Cả `gkg` và `graphify` đều CHƯA cài và đều phải init, không chạy sẵn:
- `gkg`: cài bằng install script của GitLab → `gkg index` → `gkg server start`, data ở `~/.gkg/`. Hỗ trợ TS/JS.
- `graphify`: `pip install graphifyy` (Python 3.10+) → `graphify .`

"codegraph CLI trên GitHub" — user xác nhận là 1 CLI riêng, có 6 project trùng tên. Khớp mô tả nhất: `colbymchenry/codegraph` (pre-indexed graph, auto-sync khi code đổi, làm riêng cho Claude Code/Codex/Gemini/Cursor/AntiGravity, 100% local). Chờ user xác nhận đúng repo trước khi cài.

## Chưa chốt — cần quyết sau
- **(a) Văn khấn / lịch vạn niên / ngày tốt-xấu**: codex đề nghị cắt khỏi giai đoạn đầu (nền móng trước). Đối lập: chúng rẻ, offline, zero-infra và chính là thứ làm nên "sản phẩm mùa Tết" (KinTree có 76 bài văn khấn + chế độ auto-scroll để đọc). **User đã nói "chưa cần, cứ lên plans làm sau".**
- **KinTree teardown phần sau login**: user đăng nhập bị lỗi → hoãn. Danh sách màn hình cần test lại nằm ở cuối report `kintree-recon-260821-2312-android-teardown.md`.
- Xác nhận đúng repo `codegraph` cần cài.
- V1 dùng 1 máy hay 2 máy (quyết định có cần conflict detection cho Drive sync hay không).

---

## Bổ sung sau khi có review sync/security/PWA (2026-08-22)

### D2-a — Sửa giả định về Drive sync
- **Bỏ ý "etag/revision precondition".** Không xác nhận được Google Drive `files.update` hỗ trợ `If-Match`. Thiết kế lại theo **never-overwrite + immutable conflict copy**: không ghi đè tại chỗ, ghi ra file/revision mới.
- **Background sync KHÔNG làm được.** Client browser-only public OAuth không giữ được refresh token → sync/backup phải **user-initiated** (hoặc re-auth mỗi session). Câu "background sync" ở `.plan/plan.md:127` là sai, phải sửa.

### D2-b — Backup phải là artifact user giữ được
Backup trước migration **không được** chỉ là một key khác trong IndexedDB — vì IndexedDB chính là chỗ có thể bay. Phải là **file tải về được**, và phải **verify bằng cách mở lại + đếm row** trước khi chạy bất kỳ bước migration phá huỷ nào.

Hiện tại codebase **không có đường export/backup nào** (`grep Blob|download|createObjectURL` → rỗng), chưa từng gọi `navigator.storage.persist()`, không có manifest → **iOS WebKit xoá storage sau 7 ngày, không có gì chặn**.

### D9 — Chèn milestone DURABILITY trước v0.6
Cả 4 reviewer độc lập cùng kết luận. `.plan/plan.md` hiện xếp durability + migration + PWA installable vào "v1.0 polish" — sai thứ tự. Lý do: 4 lỗi Critical đều là mất dữ liệu, và chủ dự án là user đầu tiên nhập cây thật.

Nội dung milestone (dồn gần hết vào `src/db/client.ts`, reviewer ước ~2 ngày):
- Bỏ `clearIndexedDB()` theo heuristic; thay bằng `user_version` + migration thật.
- Không bao giờ swallow lỗi IndexedDB thành "chưa có dữ liệu".
- Snapshot + persist phải cùng thứ tự, chống commit bản cũ sau bản mới; gộp 3 lần save/click.
- Thêm export/import file lossless (đây cũng là escape hatch duy nhất hiện chưa có).
- `navigator.storage.persist()` + manifest + icon + service worker → mới thực sự là PWA installable.

### D10 — Sửa tài liệu đang nói sai
- `.plan/plan.md:133-139` changelog ghi v0.5 (pan/zoom/arrow-key) là **Added** nhưng task chưa tick và **code chưa có** — vẫn `framer-motion drag`.
- `README.md:8` và `.plan/01-architecture.md:9-10,37` khẳng định PWA/offline/service-worker **là đã có** — không có gì cả.
→ Khi migrate docs (D7) phải sửa, không được copy nguyên.

### D11 — Không thêm dependency fetch lúc runtime
Privacy posture hiện tại đã kiểm chứng sạch: không analytics, không CDN, `next/font` self-host lúc build, `sql-wasm.wasm` serve từ origin mình, **zero external URL trong `src/`**. Ràng buộc này chốt lại: thư viện convert âm-dương phải **bundle offline**, không gọi mạng.

### Đã kết luận, không xét lại
- `escapeSql` quoting giá trị **không** khai thác được. Lỗi thật là **nội suy TÊN CỘT** không escape trong `updatePerson` → dùng allowlist cột hoặc parameterised builder.
- Avatar `<img>` remote là **rò rỉ privacy**, không phải XSS.

### Việc dọn nhỏ
`.claude/` không track cũng không ignore, bên trong có nested worktree → `pnpm lint` đang quét trùng một bản `src/` cũ. Cần quyết ignore hay track.

### Bảo mật của bên thứ ba (không hành động)
APK KinTree đóng gói mật khẩu keystore release ở plaintext. Đã redact, không dùng lại. Đề xuất: báo riêng cho tác giả, không công khai.

---

## Bổ sung sau khi teardown 4 web đối thủ (2026-08-22)

Nguồn: `plans/reports/web-recon-260821-2312-competitor-web-demos.md`. Tất cả số liệu dưới đây là **đo thật trong browser**, không phải claim marketing.

### D12 — SỬA LẠI: "lệch hàng thế hệ" KHÔNG phải khuyết điểm phổ biến
Trước đó (từ 1 comment FB) ta ghi đây là defect #1 của cả ngành. **Đo lại: cả 2 sản phẩm còn chạy được đều có variance 0 px.**
- `gia-pha-demo`: card tops ∈ {0, 160, 320, 480}
- `tocvoquangngai`: y ∈ {0, 375, 750, 1125, 1500} trên 398 card

Cách họ làm được (áp trực tiếp cho `FamilyTreeCanvas.tsx`):
1. **Key y theo ĐỜI tuyệt đối × pitch hằng số** — không bao giờ theo chiều cao subtree.
2. **Card box cố định + truncate** — nên độ dài tên không đẩy được gì.

→ Comment FB kia là lỗi của riêng dự án đó. Còn canvas của TA đang có lỗi **nặng hơn**: bà nội ≡ ông ngoại trùng khít toạ độ, và subtree anh chị em đè nhau (C1/C2 trong `reviewer-260821-2312-canvas-ux.md`).

### D13 — "Cả dòng họ trên 1 trang" KHÔNG hoạt động ở scale thật
Site gia phả thật (họ Võ, 292 người, 5 đời) có full view **hỏng đo được**: 231 trong ~393 cặp card liền kề cùng hàng ở **gap 0 (trùng khít hoàn toàn)**, nhãn trống. View theo từng nhánh thì đúng. Canvas full: 27.657 × 1.675 px, tỉ lệ 16.5:1.

→ **Ship per-branch làm chế độ chính**, không phải toàn cảnh. Toàn cảnh cần: collapse-summary card **giữ nguyên ô trong grid** + dot-LOD dưới ~25% zoom.

### D14 — Kiến trúc render: 1 `<path>` cho cả cụm, không phải 1 path mỗi edge
Cách cả 2 sản phẩm chạy được đều làm: **HTML card + SVG link dùng CHUNG một CSS transform giống hệt nhau**, và toàn bộ đoạn parent→child được nối thành **một `<path>` duy nhất** (drop xuống giữa gutter → bus ngang → vertical xuống từng con).
Canvas của ta đã đúng hình dạng nhưng **đang emit 1 `<path>` mỗi edge**.

### D15 — Dữ liệu thật phá schema ngây thơ (ĐỔI DATA MODEL)
1. **Dòng họ là FOREST, không phải tree.** "ĐỜI 1" của họ Võ có **106 record** — gia phả công bố là rừng ~50 gốc. → nhiều root / component rời rạc là **trạng thái BÌNH THƯỜNG**, không phải lỗi. Anchor là per-component. "Không có đường đi giữa 2 người" là câu trả lời hợp lệ, khác với "không xác định được".
2. **Người có thể KHÔNG có tên riêng.** Record thật: `Bà Võ Văn Mượng` — vợ chỉ được ghi là "Bà ‹tên chồng›". → họ/tên đệm/tên **không được NOT NULL hết**; cần state "chỉ biết là vợ của X" và phải round-trip qua export/GEDCOM mà không tự bịa tên. Cần field **honorific riêng** (Bà/Ông/Cụ không được nhét vào tên).
3. **Họ dùng ALL-CAPS để mã hoá vai vế** trong tên → đúng anti-pattern mà `sibling_order` tường minh (D5) thay thế. Ghi nhận là migration hazard khi import.

### D16 — SỬA LẠI D-về-người-đã-mất: thực tế là KHÔNG đánh dấu gì
Trên gia phả thật, card người mất và người sống **giống hệt nhau về style** (Võ Quý 1957–2016 vs Võ Hòa 1976–?, byte-identical). **Năm mất là toàn bộ tín hiệu.**
→ Giải quyết dứt điểm tranh luận trên FB (đòi ký hiệu vs lo "đau lòng"): **hiện năm, không thêm marker.**
→ Kéo theo: ngày tháng mới là thứ mang nghĩa, nên `is_living` phải **suy ra / optional**, không phải cờ NOT NULL load-bearing. (Reviewer đã tìm ra bug: NULL `is_living` → `false` → gắn ✝ cho người còn sống.)

### D17 — Đa thê: KHÔNG AI làm — cơ hội lớn nhất, và là bài toán LAYOUT thuần
Không có ví dụ đa thê sống nào trên cả 4 site. Dự án duy nhất có model là GIAPHAX (backend đã chết): `spouseIds[]` + label chuỗi `second_wife: "Vợ thứ"`, `concubine: "Thứ thất"`, `Con riêng`, `Con nuôi`.
→ Đó là cách tiếp cận **nhãn phẳng**: không trả lời được "con của bà nào", và "Thứ thất" là **presentation, không phải structure**. Union model (D3) hơn hẳn.

### D18 — Bằng chứng mạnh nhất cho D1 (local-first)
**2 trong 4 backend đối thủ ĐÃ CHẾT:**
- `giaphax.io.vn`: front-end còn chạy, `POST /api/supabase/query` → **500, tenant not found** (Supabase project bị pause/xoá)
- `hyhon.io.vn`: giờ là **CV cá nhân của tác giả**, không còn chữ nào về gia phả

**Hai site duy nhất còn render được cây chính là hai site không có backend.** `ancestortree.info/tree` thì hard-redirect sang login.

### D19 — Demo hàng đầu nhỏ hơn nhiều so với claim
`gia-pha-demo` quảng cáo 15 đời / 300+ người; **demo public chỉ có 15 người / 4 đời**, và `/people`, `/directory`, `/events` **rỗng**. Auto-fit mở cây 15 người ở `scale(0.12)` → trông như canvas trắng. Search **không fold dấu** (`nguyen van khoa` → không ra gì). Mobile hỏng: ở 375px sidebar chiếm 256px, `<main>` còn **119px**.
→ Sửa lại note ở `link1-gia-pha-dien-tu.md`: "15 đời / 300+ người" là cây riêng của tác giả, **không phải** thứ đã kiểm chứng được.
→ Bài học rẻ cho ta: **fold dấu khi search** và **đừng auto-fit về scale nhỏ hơn ~0.5**.

### D20 — Xưng hô: chỉ 1 site chạy thật
`tocvoquangngai` là nơi duy nhất thấy xưng hô hoạt động: *"Võ Quý **là ông ngoại của** Võ Minh Huy"* — và **đúng bên ngoại**. Xác nhận feature này khả thi, không chỉ là lý thuyết.

### D21 — Privacy đối thủ
Cả 4 site: **zero third-party request** (không analytics, không CDN, font self-host). Nhưng: GIAPHAX có **catalogue công khai các cây đã publish** + `logAnalyticsEvent`; `tocvoquangngai` **công bố toàn bộ đồ thị quan hệ của 292 người đang sống, không auth**. Giảm nhẹ: avatar chỉ là placeholder `img_avatar_man.svg` — **không lộ mặt thật**.
→ Nếu ta làm tính năng share/publish thì mặc định phải là **không index, không lộ người sống**.

---

## D22 — Cơ chế lưu trữ: SQLite quan hệ, shape theo GEDCOM (user chốt 2026-08-22)

User đặt câu hỏi đúng: dữ liệu gia phả **là graph**, sao lại lưu bằng SQL? Đã xét 4 hướng, kể cả MongoDB.

### Vì sao không phải graph database
1. **Không có bài toán hiệu năng nào để giải.** Gia phả thật lớn nhất đo được: 292 người. Tác giả dòng họ 15 đời nói "chắc handle tối đa được 1000 người". Ở 1000 người dữ liệu **dưới 1 MB** — nằm gọn trong RAM, duyệt là microsecond bằng JS thuần.
2. **Engine xưng hô duyệt trong memory bất kể chọn DB nào**, vì logic thật là *đường dẫn dạng chuẩn `[SPOUSE?] PARENT* CHILD* [SPOUSE?]`, tối đa một bước hôn nhân, xếp hạng ngắn-trước, tra override, áp policy vùng miền* — **logic ứng dụng, không phải logic truy vấn**. Cypher/SPARQL không diễn đạt gọn hơn một hàm BFS viết tay.
3. → Việc của DB không phải truy vấn nhanh, mà là **lưu có kiểu + ép ràng buộc + ra một file portable**.

### Tiêu chí quyết định: format phải sống lâu hơn app
Gia phả phải đọc được sau 50 năm, khi app này chết từ lâu. Codex đã cảnh báo: *"dev solo cũng là một rủi ro lưu trữ — app có thể biến mất trước gia phả rất lâu."*

Bằng chứng chống lại các lựa chọn mới:
- **Kuzu** (graph DB embedded có WASM dẫn đầu): bị Apple mua, **repo archive từ 10/2025**. Cộng đồng phải fork sang LadybugDB.
- **MongoDB tự khai tử dòng local-first của chính mình**: Atlas Device Sync + Atlas Device SDKs (Realm) + **Atlas Data API** + Custom HTTPS Endpoints → **EOL 30/09/2025**, thông báo từ 09/2024. Realm còn là DB local OSS nhưng bản 20.x+ **bỏ hẳn sync**.
- Đã quan sát trực tiếp: 2/4 backend đối thủ chết trong ~6 tháng.

### Vì sao không phải MongoDB (cả 3 nghĩa)
1. **Atlas cloud** — Data API đã EOL nên **browser không còn đường nói chuyện với Atlas**; bắt buộc phải có backend → phá D1, phá zero-setup, tái tạo đúng failure mode của đối thủ. Comment top 23 like: *"lưu dữ liệu gia phả trên đám mây tập trung của bạn thì không mấy ai muốn dùng."*
2. **Self-host** — phá zero-setup tệ hơn nữa. User đối thủ không cài nổi Supabase/Vercel dù có hướng dẫn; bắt trưởng họ chạy `mongod` là loại 99% người dùng.
3. **Document model local (RxDB/PouchDB/Dexie)** — làm được thật, và RxDB là bản thay thế Realm chính danh. Nhưng: cạnh graph là many-to-many nên document store buộc chọn *embed* (nhân bản người → **phá invariant "không bao giờ clone"**, tạo 2 tiểu sử xung đột) hoặc *reference + join trong app code* (thì DB chỉ còn làm việc lưu). Và mất toàn bộ ràng buộc do engine ép — dồn về app code **đúng chỗ codebase này đã có bug được chứng minh** (boolean lưu int mà khai `boolean`, NULL map thành `false` gắn ✝ cho người sống, nội suy tên cột không escape). "Schemaless nên khỏi migration" là ảo giác: chỉ đổi migration tường minh thành **schema drift ngầm**.

### Vì sao SQLite thắng — và một chỗ tự phản biện
**Thắng ở**: ràng buộc lúc ghi do engine ép (FK, CHECK, trigger, partial unique index cho `is_lineage`) — *thứ duy nhất trong kiến trúc này bảo vệ dữ liệu khỏi bug của chính ta*. Cộng: chủ dự án là dev, **mở được file bằng bất kỳ tool SQLite nào để tự soi dữ liệu nhà mình** — lợi ích dùng cả đời.

**Tự phản biện, phải ghi lại**: lập luận "SQLite cho transaction/durability" **yếu hơn nghe** trong kiến trúc hiện tại — mỗi lần ghi là `db.export()` toàn bộ rồi `put` một blob vào IndexedDB, nên bảo đảm nguyên tử của SQLite **dừng ở biên persist**. Artifact được lưu có đúng đặc tính "ghi lại toàn bộ hoặc không" như một file JSON. SQLite không mua thêm gì ở tầng đó. (→ đây là lý do độc lập để làm D9 durability.)

### GEDCOM 7 xác nhận shape — union-first-class không phải overengineer
[Spec GEDCOM 7](https://gedcom.io/specifications/FamilySearchGEDCOMv7.html) (2021), chuẩn trao đổi gia phả 40 năm của ngành:
- Mỗi người = record **INDI**. Mỗi gia đình = record **FAM**, là **record hạng nhất**, không phải nhãn gắn lên người. Liên kết bằng con trỏ hai chiều.
- Và: spec nói rõ **không được suy ra giới tính, vai, hay danh hiệu từ việc một người nằm ở slot `HUSB` hay `WIFE`** — gọi chung là *"partners"*.

→ Trùng khớp độc lập với quyết định của agent thiết kế: *"không code path nào đọc giới tính, nên giả định về giới tính không thể làm hỏng graph."*
→ GEDCOM giữ `HUSB`/`WIFE` thành 2 slot cố định **chỉ vì tương thích ngược** — chính spec thấy không ổn với cách encode đó. `union_partners` dạng dòng là cách encode **đúng cái GEDCOM 7 muốn nói**.
→ Vì import/export GEDCOM là yêu cầu đã nêu, schema càng gần GEDCOM thì càng ít mất mát khi chuyển đổi.

---

# Chốt cuối phiên (user duyệt từng câu, 2026-08-22)

## D23 — V1 dùng 5 bảng
`persons` · `unions` · `union_partners` · `parentages` · `date_facts`.

**Cắt khỏi v1**: `relationship_overrides` (chỉ có ích khi engine xưng hô đã chạy — sẽ rỗng cho tới lúc đó) và `app_settings` (cỡ chữ + ngôn ngữ thuộc về **thiết bị** nên localStorage đúng hơn).

Hoãn được vì chúng là **bảng MỚI**, không phải sửa bảng cũ. 5 bảng kia **không hoãn được**.

## D24 — Hôn nhân: 2 bảng `unions` + `union_partners`
`partner_seq` = thứ tự cuộc hôn nhân đó **trong đời người đó**. Ông 3 bà → ông mang seq 1/2/3; mỗi bà mang seq 1 của mình. Đa thê và đa phu dùng **chung một cơ chế**, không code path nào đọc giới tính → giả định về giới tính không thể làm hỏng graph. Trigger ép bất biến 2 người.

Đây là cách encode **đúng cái GEDCOM 7 muốn nói** — spec giữ `HUSB`/`WIFE` thành 2 slot chỉ vì tương thích ngược, và chính spec nói không được suy giới tính/vai từ slot. Xem D22.

## D25 — Ngày tháng: bảng `date_facts` riêng
5 loại ngày (sinh, mất, **giỗ**, cưới, an táng) × 7 thông tin (lịch âm/dương, năm, tháng, ngày, `is_leap_month`, `precision`, nguồn).

Bảng riêng thay vì 35 cột nhồi vào `persons`: ràng buộc tháng nhuận / độ chính xác viết **một lần** thay vì lặp 5 lần; "giỗ sắp tới" thành index seek; thêm loại ngày mới không cần migration.

Bằng chứng: đúng chỗ này một dev đã mổ công khai giapha-os — *"cách bạn define day trong Person model cũng không hợp lý vì bạn chia quá nhiều"*.

## D26 — Xưng hô: hoãn sang v2, schema chừa sẵn chỗ
Tốn nhất trong tất cả: **14 case** quy tắc đệ quy không đủ, và cần bảng từ vựng Bắc/Trung/Nam mà **hiện chưa có nguồn nào kiểm chứng được**. Không chặn việc nhập gia phả. Hoãn rất rẻ vì chỉ thêm bảng mới, không migration.

Spec đầy đủ đã viết sẵn: `plans/260821-2350-restructure-v1/proposal-kinship.md`.

## D27 — Hai thiết bị: desktop nhập + điện thoại tra
Khớp workflow user VN phản ánh: *"dùng máy tính nhập một lượt thì nhanh hơn, về sau có thay đổi nhỏ gì thì sửa trên điện thoại"*.

Hệ quả: Drive sync **cần** never-overwrite + tạo bản conflict bất biến, nhưng **không cần UI merge** — bản mới thắng, bản cũ giữ thành version. Desktop tối ưu cho nhập hàng loạt; mobile tối ưu cho tra cứu và sửa nhỏ. Không cố làm hai bên giống nhau.

## D28 — Roadmap: durability và canvas làm SONG SONG
User chọn song song thay vì durability-first. Hợp lý về file ownership: durability nằm ở `src/db/client.ts`, canvas nằm ở `src/components/` → **không đạp nhau**.

Ràng buộc kèm theo: **không được nhập dữ liệu thật vào cho tới khi phase durability xong.** Nếu không thì đúng rủi ro reviewer cảnh báo — nhập cây thật lên một nền còn 4 đường mất dữ liệu.

## D29 — Test trước, migration sau
`node:test` + harness sql.js phải có **trước khi** viết migration. Agent thiết kế tự xác định đây là rủi ro lớn nhất của nó: migration đã validate trên DB nháp 16 người / 27 cạnh nhưng **không có test nào chạy lại được**.

Migration là đoạn code duy nhất có thể phá dữ liệu thật, nên không được là đoạn không có test. Các script kiểm chứng đã viết sẵn trong phiên này, chỉ cần đóng thành harness.

## D30 — Xoá `.plan/`, GIỮ `.agent/` chờ xác nhận
User nói "xoá cả 2". Đã xoá `.plan/` (7 file tracked → git phục hồi được, và đúng là tài liệu bị thay thế).

**`.agent/` giữ lại**: 202 file, **0 file được git track**, không commit nào chứa → xoá là **mất vĩnh viễn**. Và nội dung không phải tài liệu dự án mà là **Antigravity Kit** (20 agent, 36 skill, 11 workflow, scripts Python, `.shared/ui-ux-pro-max`). Cần user xác nhận lại trước khi xoá.

3 file `.plan/analysis-*.md` đã chuyển sang `plans/reports/analysis-260228-legacy-*.md` kèm nhãn **SUPERSEDED**.

---

## D31 — Ràng buộc DB cũ: trigger thay FK, cách ly thay xoá (Phase 1A, 2026-08-22)

Nguồn: `plans/reports/fullstack-260822-0157-phase1a-durability.md`.

**Trigger thay vì dựng lại bảng.** Bảng `relationships` của DB v0.x được tạo không có mệnh đề `FOREIGN KEY`, và SQLite không cho `ALTER TABLE ADD FOREIGN KEY` — nên bật `PRAGMA foreign_keys = ON` một mình bảo vệ đúng 0% DB đang tồn tại trên máy người dùng. Lựa chọn: dựng lại bảng (di chuyển toàn bộ dữ liệu qua bảng mới có FK — có bước phá huỷ, vi phạm luật bất biến #3) hay dùng trigger (`CREATE TRIGGER IF NOT EXISTS` thêm được vào bảng đã tồn tại, không di chuyển dữ liệu). Chọn **trigger**: ràng buộc như nhau cho DB mới và DB cũ, không có bước phá huỷ. Đánh đổi: `PRAGMA foreign_keys = ON` vẫn được bật để giữ ý định tường minh và bảo vệ mọi engine khác đọc trực tiếp file DB, nhưng bản thân pragma không phải lớp bảo vệ chính — 7 trigger mới là lớp bảo vệ chính.

**Cách ly thay vì xoá.** SQLite **không** kiểm lại row đã tồn tại khi bật `foreign_keys`, nên row xấu cũ không làm các lần ghi khác thất bại. Vấn đề cụ thể là khác: trigger `trg_rel_person_exists_update` đọc `NEW.person_id` / `NEW.related_to_id`, nên một row orphan có sẵn trở thành **không sửa được và không xoá-bằng-cách-sửa được** qua app — mọi `UPDATE` lên nó đều bị abort vì `NEW` vẫn mang id không tồn tại. Row đó sẽ nằm đó mãi, vô hình với người dùng, và mọi đoạn code đọc bảng về sau phải tự xử lý lại. Lựa chọn: xoá row xấu (mất dữ liệu, vi phạm luật bất biến #3) hay cách ly. Chọn **cách ly**: row xấu chuyển sang bảng `relationships_quarantine` (cột `reason`: `orphan-edge` / `self-relationship`, `quarantined_at`) trước khi trigger được tạo, không mất gì, xem lại được. Chưa có UI hiển thị bảng cách ly cho người dùng — việc còn lại, không phải quyết định chưa chốt.
