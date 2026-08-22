# Roadmap

> Cập nhật 2026-08-22 sau đợt research + review. Quyết định và lý do: [`docs/decisions.md`](../docs/decisions.md).
> Thứ tự này **đảo lại** roadmap cũ: durability + migration + PWA từng bị xếp vào "v1.0 polish", giờ lên đầu. Cả 4 reviewer độc lập đều đề nghị vậy.

## Cổng chặn

> **Cổng đã MỞ** (2026-08-22). Phase 0 + 1A + 1B xong: 4 lỗi mất dữ liệu đã sửa, đã có export/import file lossless, và có harness chạy lại được (`pnpm test` → 35/35).
> Chứng cứ: [`plans/reports/fullstack-260822-0157-phase1a-durability.md`](reports/fullstack-260822-0157-phase1a-durability.md) · [`tester-260822-0157-phase0-harness.md`](reports/tester-260822-0157-phase0-harness.md) · [`fullstack-260822-0157-phase1b-canvas.md`](reports/fullstack-260822-0157-phase1b-canvas.md)
>
> Vẫn còn **một** rủi ro chưa đóng trước khi nhập cây lớn: chưa phải PWA, nên iOS có thể xoá storage sau 7 ngày không dùng (Phase 3). Export file thủ công là đường thoát duy nhất tới lúc đó — **xuất file sau mỗi buổi nhập**. (D28)

---

## Phase 0 — Test harness ✅ XONG 2026-08-22
`pnpm test` → `node:test` built-in, **zero dependency mới**, sql.js nạp wasm thật 3.49.1. 35 test.

- [x] `node:test` + harness sql.js trong `package.json`
- [x] Đóng gói các script kiểm chứng đã viết trong phiên research thành test chạy lại được
- [x] Test ràng buộc DDL: FK bật, orphan edge bị chặn, tự làm cha mình bị chặn, chu trình A→B→A bị chặn
- [x] Fixture layout (xem `docs/tree-layout.md` §12): 4 ông bà · 2 anh chị em × 4 con · 1 ông + 3 bà + 9 con
- [ ] `pnpm lint` vào CI **riêng** — repo **chưa có `.github/`** nào; `pnpm lint` và `pnpm test` đã là lệnh chạy được, còn thiếu đúng phần CI

Thêm ngoài kế hoạch: `tests/migration.test.ts` (DB v0.x → v1, đường duy nhất phá được dữ liệu thật) và `tests/tree-layout.test.ts` (3 bug layout đã đo được).

---

## Phase 1 — Hai nhánh SONG SONG (D28)

File ownership không đạp nhau: 1A ở `src/db/`, 1B ở `src/components/`.

### 1A — Bền vững dữ liệu · `src/db/` ✅ XONG 2026-08-22
Chi tiết: [`docs/sync-durability.md`](../docs/sync-durability.md)

Phát hiện thêm khi kiểm chứng: bảng `relationships` của DB v0.x tạo **không có mệnh đề `FOREIGN KEY`**, mà SQLite không cho `ALTER TABLE ADD FOREIGN KEY` → `PRAGMA foreign_keys = ON` một mình bảo vệ **0%** DB đang tồn tại. Ràng buộc thật do **7 trigger** đảm nhiệm (thêm được vào bảng cũ, không phải dựng lại bảng). Row xấu **cách ly** sang `relationships_quarantine`, không xoá.

- [x] **Export/import file lossless** — làm trước tiên. Escape hatch duy nhất hiện không có
- [x] Bỏ `clearIndexedDB()` theo heuristic 5 cột; thay bằng `PRAGMA user_version`
- [x] Lỗi đọc IndexedDB **không bao giờ** được hiểu là "chưa có dữ liệu" — phân biệt 3 trạng thái
- [x] Sửa thứ tự snapshot/persist (bản cũ đang có thể commit sau bản mới)
- [x] Gộp 3 lần save mỗi click thành 1
- [x] Memo **promise** khởi tạo, không memo kết quả (đang double-init ở mount đầu)
- [x] `BEGIN`/`COMMIT` cho mọi thao tác nhiều câu lệnh
- [x] `PRAGMA foreign_keys = ON` mỗi connection + dọn row xấu trước
- [x] `navigator.storage.persist()`
- [x] Ngoài kế hoạch: `createPersonWithRelationships()` — tạo người + mọi cạnh của họ trong MỘT transaction. Trước đó `createPerson` xong rồi `createRelationship` bị ràng buộc chặn sẽ để lại người mồ côi dù UI báo lỗi
- [ ] UI cho bảng `relationships_quarantine` — người dùng hiện chưa thấy được row nào đã bị cách ly

### 1B — Canvas vẽ đúng · `src/components/` — hình học XONG, tương tác chưa
Chi tiết: [`docs/tree-layout.md`](../docs/tree-layout.md). Layout giờ là hàm thuần `computeTreeLayout()` trong `src/lib/tree-layout.ts`.

- [x] Tách `tree-layout.ts` thành **hàm thuần**, không import React → đây là chỗ test được
- [x] `y` = **đời tuyệt đối × pitch hằng số**; card box cố định + truncate tên
- [x] **Reserve chiều rộng subtree** cho `x` → hết trùng bà nội/ông ngoại và hết đè subtree anh chị em
- [x] Gộp connector thành **một `<path>`** thay vì một path mỗi cạnh; bỏ path "bridge" trùng hình học
- [x] `EX_SPOUSE` render khác `SPOUSE`
- [ ] Per-branch là chế độ chính; collapse-summary **giữ ô trong grid**; dot-LOD dưới ~25% zoom
- [x] Scroll-based panning + zoom giữ điểm neo + arrow key + nút **fit/reset**
- [x] Nhiều gốc (forest) — không render canvas rỗng khi không giải được anchor
- [x] Nút "Thêm Anh/Chị/Em" hiện **ghi orphan rồi báo thành công** → phải xử lý case chưa có cha/mẹ
- [ ] Cao độ đường ngang riêng theo từng bà (đa thê) — cần `union_id`, chặn tới Phase 2
- [x] Touch target ≥ 44 px · contrast fail đã sửa (kiểm lại bằng tính WCAG thật: **1.60→10.95:1** và **2.52→4.79:1**) · `prefers-reduced-motion` · bỏ bẫy focus vô hình
- [x] Bỏ `window.__giapha.seed` khỏi bundle production (đang mở đầu bằng `DELETE FROM persons`)

---

## Phase 2 — Data model v2 + migration
> Mục "convert âm–dương" đã chuyển sang Phase 5: Phase 2 không có gì phụ thuộc nó (lưu lịch âm không cần convert). Lõi đã làm xong sớm, xem Phase 5.
**Cần**: Phase 0 và 1A xong. Chi tiết: `plans/260821-2350-restructure-v1/proposal-data-model.md` + `migration.md`

- [x] 6 bảng: `persons` · `unions` · `union_partners` · `parentages` · `date_facts` · `app_settings` — `src/db/schema-v2.ts`. Kiểm ở CẢ hai engine: 6 bảng, 18 index, 3 trigger, 41/41 ràng buộc đúng. (`app_settings` thêm vào vì migration_report cần chỗ ở; `relationship_overrides` vẫn để Phase 5)
- [x] Migration ghi vào **key mới** `main.v2`, blob v1 nằm nguyên ở `main` — `src/db/migrate-storage.ts`. Có test khẳng định bytes v1 không đổi một byte nào sau migration
- [x] `verifyBackupBytes()` mở lại + đếm row; chưa verify thì `migrateBytesToV2()` TỪ CHỐI chạy
- [~] `MigrationReport.reviewList` đã sinh đủ 7 loại mục (thứ tự vợ cả, con thuộc bà nào, ngày mất âm dạng chữ, số điện thoại lạ, thiếu tên, ngày bị bỏ, chu trình đã gỡ) và lưu trong `app_settings`. **UI để giải quyết chưa có.**
- [x] `updatePerson`: allowlist `WRITABLE_PERSON_COLUMNS` sinh từ chính bảng khai báo cột trong `schema.ts`; tên cột lạ ⇒ `UnknownColumnError`
- [x] `is_living` tri-state: `undefined` = chưa rõ. `lifeStatus()` ở `src/lib/person-status.ts` suy ra từ dữ kiện mất; ✝ chỉ hiện khi CHẮC CHẮN đã mất; `SidePanel` có badge "Chưa rõ"

---

## Phase 3 — PWA installable ✅ XONG 2026-08-22
Chi tiết: [`plans/reports/fullstack-260822-0157-phase3-pwa.md`](reports/fullstack-260822-0157-phase3-pwa.md)

- [x] manifest + icon + service worker — icon sinh **offline** bằng `rsvg-convert`, không tải gì từ mạng; 0 dependency mới
- [x] Cẩn thận: SW shell cũ có thể chạy code cũ và **xoá cây đã migrate** — xử lý bằng **network-first cho document + JS**, cache-first CHỈ cho allowlist asset bất biến; SW không chạm IndexedDB. `tests/pwa.test.ts` làm đỏ test nếu ai phá 3 rào này
- [x] Đây là điều kiện để iOS **không** xoá storage sau 7 ngày
- [ ] **Chưa kiểm được trên thiết bị iOS thật** — add-to-home-screen mới chỉ đúng về mặt khai báo (manifest + `apple-touch-icon` 180×180 RGB không alpha, đã verify trong `out/`)

---

## Phase 4 — Google Drive sync
Chi tiết: [`docs/sync-durability.md`](../docs/sync-durability.md) §5

- [ ] OAuth PKCE, không client secret
- [ ] **User-initiated**, không background (browser-only client không giữ được refresh token)
- [ ] **Never-overwrite** + bản conflict bất biến; không dùng precondition `If-Match` (không xác nhận được Drive hỗ trợ)
- [ ] Định danh file bằng id, không bằng tên (tránh phân nhánh do trùng tên)
- [ ] Snapshot có version, giữ N bản gần nhất
- [ ] 2 thiết bị: phát hiện xung đột, **không** cần UI merge — bản mới thắng, bản cũ thành version (D27)

---

## Phase 5 — v2

- [ ] **Engine xưng hô** (D26) — spec đã viết: `plans/260821-2350-restructure-v1/proposal-kinship.md`. Kèm `relationship_overrides` + `app_settings` lúc này
- [ ] GEDCOM + CSV import/export
- [ ] In: bảng tông đồ + PDF/ảnh kèm năm sinh (ảnh mặt người **tắt mặc định**, xem `docs/culture-vietnam.md` §8.3)
- [ ] **Lịch vạn niên + Can Chi + ngày tốt/xấu** — tính offline thuần, zero-infra
  - [x] Lõi convert âm–dương: `src/lib/lunar-calendar.ts`, thuật toán Hồ Ngọc Đức tự cài, **0 dependency**, round-trip sạch 1901–2099. Kiểm độc lập: Tết 2020–2026 đúng mốc, **Tết 2007 = 17/02 (VN) chứ không phải 18/02 (TQ)** ⇒ UTC+7 được áp thật. Ngoài 1900–2100 ⇒ `RangeError`.
    **Làm sớm hơn cần thiết** (2026-08-22): Phase 2 không có gì dùng tới nó — `date_facts` chỉ LƯU lịch âm, migration cố tình không parse `death_lunar` (luật bất biến #7). Hiện chưa ai import ⇒ không nằm trong bundle. Chờ tới khi làm nhắc giỗ.
- [ ] **Văn khấn** + chế độ tự đọc
- [ ] Cỡ chữ + phông chữ đổi được (người đọc chính là người cao tuổi)
- [ ] Search fold dấu (`nguyen van khoa` phải khớp `Nguyễn Văn Khoa`)

---

## Chưa xếp phase

- [x] `.agent/` đã xoá 2026-08-22, **không phục hồi được** — post-mortem đầy đủ (4 đường phục hồi đã kiểm, và bài học `tar && rm`) ở [`docs/repo-layout.md`](../docs/repo-layout.md) §2. Không ảnh hưởng `src/` hay build. (D30)
- [x] `.claude/` — thư mục **hiện không còn tồn tại** trong repo (2026-08-22). `pnpm lint` không còn quét bản `src/` cũ nào; 12 lỗi lint cũ = 7 lỗi thật (đã sửa) + 5 lỗi từ bản copy trong `.claude/worktrees/` (đã biến mất cùng thư mục)
- [ ] Codegraph — user nói "tính sau". Xác nhận đúng repo trước khi cài (D8)
- [ ] KinTree teardown phần sau login — user đăng nhập bị lỗi. Danh sách màn hình cần test lại ở cuối `plans/reports/kintree-recon-260821-2312-android-teardown.md`
- [ ] Báo riêng cho tác giả KinTree về việc mật khẩu keystore release bị đóng gói plaintext trong APK (D30, không công khai)

## Không làm (codex đề nghị cắt, chưa phản bác)

Social feed · multi-user editing thời gian thực · AI chatbot · OCR sách gia phả · nhận diện mặt · VNeID · gộp gia phả toàn quốc · gallery ảnh/video + CDN · Google Maps mộ phần · quỹ khuyến học / hương ước / cầu đường · Google Calendar · phân quyền chi tiết + audit UI.

Lý do: tất cả là chuyện phụ cho tới khi user **nhập được, hiểu được, backup được và in được một cây đúng**.

---

## Changelog (giữ từ `.plan/plan.md`)

### Chưa release — 0.6.0 (WIP)
> Kiểm chứng bằng `pnpm test` (35/35) + `pnpm lint` (0) + `pnpm build` (PASS) ngày 2026-08-22.

**Added** harness test `node:test` + sql.js (zero dep mới) · export/import file gia phả lossless + nút Xuất/Nhập · `PRAGMA user_version` + migration cộng thêm · 7 trigger ràng buộc toàn vẹn · bảng cách ly `relationships_quarantine` · `src/lib/tree-layout.ts` (layout hàm thuần) · `navigator.storage.persist()` · `createPersonWithRelationships()` nguyên tử.

**Fixed** 2 đường mất dữ liệu trong `client.ts` · ghi đè sai thứ tự + 3 save/click · double-init · bà nội trùng ông ngoại · subtree anh chị em đè nhau · canvas rỗng khi không giải được anchor · "Thêm Anh/Chị/Em" ghi orphan rồi báo thành công · `window.__giapha.seed` trong bundle production · 7 lỗi lint.

**Chưa làm** pan/zoom/arrow-key/fit · a11y (touch target, contrast, reduced-motion) · per-branch + LOD · PWA.

### 0.5.0 (bỏ dở)
> **Cảnh báo**: changelog cũ ghi các mục dưới đây là **Added**, nhưng `grep onWheel|keydown|scale(|onTouch` trong `src/` → **0 hit**. Canvas vẫn là `motion.div drag` của v0.4. Các mục này **chưa tồn tại**.

- [chưa làm] Thay framer-motion drag bằng scroll-based panning
- [chưa làm] Zoom (mouse wheel + pinch + nút +/−)
- [chưa làm] Arrow key navigation
- [chưa làm] Demo data 4 thế hệ có đa thê + người đã mất
- [xong] Nghiên cứu thêm repos tham khảo

### 0.4.1 — 2026-03-12
Fixed lệch đường kẻ stem/card (áp SVG toạ độ tuyệt đối) · anh chị em cùng hàng với anchor · đường nối con từ giữa vợ/chồng · `getRelationLabel` nhận biết Ông/Bà/Cháu · vai vế gender-specific.

### 0.4.0 — 2026-03-12
Anchor badge ⭐ đổi người trung tâm · 4 nút (+) phân biệt màu/icon · vai vế trên badge card · `seedDemoData()` · fix connector, canvas center, `rowToObject` boolean · redesign PersonCard.

### 0.3.0 — 2026-03-06
Nút (+) thêm nhánh trực tiếp · auto-create relationship + dynamic form header · redesign PersonCard & FamilyTreeCanvas.

### 0.2.0 — 2026-03-05
Fix NOT NULL constraint & empty tree · responsive mobile UI · i18n VI/EN · gợi ý họ · onboarding form tách Họ/Tên đệm/Tên.

### 0.1.0 — 2026-03-04
Khởi tạo Next.js + sql.js · schema `persons` (25 field) + `relationships` · onboarding MVP.

### 2026-02-28
Khởi tạo `.plan` · tải source tham khảo.
