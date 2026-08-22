# Quyết định kiến trúc

Mỗi mục ghi **quyết định**, **vì sao**, và **cái gì sẽ chứng minh nó sai**. Không sửa mục cũ — thêm mục mới ghi "thay thế mục N".

`docs/` khẳng định · `plans/reports/` chứng minh. Mọi khẳng định ở đây phải trích được về một report có ngày.

---

## 1. Giải quyết fork: lấy `origin/main` (Vite + sqlite-wasm/OPFS) làm nền

**Ngày:** 2026-08-22 · **Nguồn:** [`plans/reports/analysis-260822-1833-fork-main-vs-origin.md`](../plans/reports/analysis-260822-1833-fork-main-vs-origin.md)

Dự án từng rẽ thành hai nhánh từ base `8ed7c2a` (2026-03-06) và đi hai hướng loại trừ nhau:

| | nhánh được chọn | nhánh bị thay thế |
|---|---|---|
| Framework | **Vite** | Next.js |
| SQLite | **@sqlite.org/sqlite-wasm + OPFS + worker** | sql.js + IndexedDB |
| Test | **vitest** | node:test |
| Package manager | **npm** | pnpm |

**Quyết định:** nhánh Vite/OPFS làm nền. Nhánh Next/sql.js được giữ nguyên vẹn tại
branch `archive/next-sqljs-260822` (đã push lên origin), không xoá.

**Vì sao:**

1. Nhánh Vite đi trước về runtime, migration runner, toàn vẹn dữ liệu và độ rộng
   feature — 19 commit, có CI, lint sạch, 125 test xanh lúc đo.
2. Nó **đã giải xong hai việc** nhánh kia còn chặn: mô hình `family_unions`
   (đa thê) và xưng hô theo phương ngữ vùng — differentiator lõi theo
   [`culture-vietnam.md`](culture-vietnam.md) §5.
3. Phần nhánh kia hơn đều **cộng thêm được**: một cột + migration cho tháng
   nhuận, một hàm thuần cho âm lịch, PWA là file tĩnh. Ngược lại, port xưng hô +
   GEDCOM + paste import + OPFS + union model sang Next/sql.js là viết lại gần hết.

**Cái gì chứng minh quyết định này sai:** nếu OPFS tỏ ra không dùng được trên một
trình duyệt mà người dùng thật đang dùng (Safari iOS cũ), hoặc yêu cầu
cross-origin isolation (COOP/COEP, xem mục 3) không đáp ứng được ở nơi hosting.

### Đã port từ nhánh cũ sang

| Thứ | Ở đâu bây giờ |
|---|---|
| Cứu dữ liệu IndexedDB của bản sql.js | `src/db/legacy-indexeddb.ts`, gọi trong `src/db/sqlite.worker.ts` |
| Tháng nhuận âm lịch | migration v6 trong `src/db/schema.ts` |
| Chuyển đổi âm ↔ dương | `src/lib/lunar-calendar.ts` |
| PWA (manifest, service worker, icon) | `public/`, `src/pwa/` |
| Luật domain gia phả Việt Nam | [`culture-vietnam.md`](culture-vietnam.md) + `plans/reports/` |

### Đã CHỦ ĐỘNG bỏ, đừng port lại

- **Next.js layout / `manifest.ts` dạng Next** — `next.config.ts` đã bị xoá.
- **pnpm và harness node:test** — mâu thuẫn trực tiếp với nền hiện tại.
- **`src/lib/tree-layout.ts`** (430 dòng, toạ độ viết tay) — `src/graph/layout.ts`
  chạy trong worker, mạnh hơn.
- **`migrate-storage.ts`, `schema-v2.ts`, `migrate-v2.ts`** — viết cho IndexedDB
  và cho migration runner tự chế; migration runner có version của nền hiện tại
  thay thế. Các mệnh đề `CHECK` về ngày tháng trong `schema-v2.ts` đã được khai
  thác lại vào migration v6.
- **7 trigger toàn vẹn + bảng `relationships_quarantine`** — nền hiện tại dựng
  schema từ migration nên dùng `FOREIGN KEY` thật được. Xem mục 2 cho phần còn nợ.
- **Test bản browser sql.js đổi tên cột `columns`** — không còn áp dụng.

---

## 2. Toàn vẹn quan hệ: FOREIGN KEY, còn nợ bảng `relationships`

**Ngày:** 2026-08-22

`PRAGMA foreign_keys = ON` được bật ở mỗi connection trong `applyMigrations()`.
Schema mới khai `FOREIGN KEY` thật.

**Còn nợ:** migration v1 cố ý là `CREATE TABLE IF NOT EXISTS`, nên với một file
đã tồn tại từ bản sql.js, bảng `relationships` **giữ nguyên định nghĩa cũ không
có mệnh đề `FOREIGN KEY`**. SQLite không cho `ALTER TABLE ADD FOREIGN KEY`. Vậy
với đúng những file cũ đó, FK bảo vệ 0%.

Chưa sửa. Hai đường khả dĩ: thêm trigger (được, vì trigger gắn được vào bảng có
sẵn), hoặc dựng lại bảng — nhưng dựng lại phải cân nhắc kỹ, xem mục 4.

---

## 3. App yêu cầu cross-origin isolation

**Ngày:** 2026-08-22 · **Nguồn:** `vite.config.ts`, `src/db/client.test.ts`

`sqlite-wasm` cần `SharedArrayBuffer`, nên cần `crossOriginIsolated`. Điều đó đòi
header `Cross-Origin-Opener-Policy: same-origin` và
`Cross-Origin-Embedder-Policy: require-corp`.

`vite.config.ts` đặt các header này cho `server` và `preview` — tức là **chỉ ở
dev và preview**. **Nơi hosting production phải tự gửi các header đó.** Repo hiện
chưa có config deploy nào, nên đây là việc chưa xong, không phải việc đã xong.

---

## 4. Không bao giờ dựng lại bảng đang được FK trỏ tới, nếu chưa đọc kỹ

**Ngày:** 2026-08-22 · **Nguồn:** migration v6, `src/db/schema.engine.test.ts`

`partial_dates` bị **5 khoá ngoại** trỏ vào với `ON DELETE SET NULL`
(`family_unions` ×2, `family_partners` ×2, `events` ×1).

Vì SQLite không cho `ALTER TABLE ADD CHECK`, cách "chuẩn" để thêm ràng buộc là
dựng lại bảng (tạo mới, copy, drop, rename). **Ở đây làm vậy là mất dữ liệu:**
`DROP TABLE partial_dates` sẽ kích hoạt `ON DELETE SET NULL` và **xoá sạch mọi
tham chiếu ngày** trong file. `PRAGMA defer_foreign_keys` hoãn được *kiểm tra*
nhưng không hoãn *hành động* `SET NULL`.

**Quyết định:** thêm ràng buộc kiểu đó bằng `ALTER TABLE ADD COLUMN` + **trigger**,
không dựng lại bảng. Migration v6 làm đúng vậy. Đây cũng chính là lý lẽ mà nhánh
cũ đã dùng để chọn trigger thay cho FK.

---

## 5. Migration phải được kiểm trên engine thật

**Ngày:** 2026-08-22 · **Nguồn:** `src/db/schema.engine.test.ts`

`src/db/schema.test.ts` chạy `applyMigrations()` qua một executor ghi lại câu
lệnh. Nó chứng minh **thứ tự** câu lệnh, nhưng **không** chứng minh SQLite chấp
nhận chúng. Migration là con đường duy nhất chạm vào file dữ liệu thật của một
gia đình.

**Quyết định:** mọi migration phải có test chạy trên engine SQLite thật.
`schema.engine.test.ts` dùng `node:sqlite` (SQLite 3.53.4, khớp gần nhất với bản
wasm `^3.53.0` đang ship) và kiểm cả đường **file schema sql.js cũ → v6 mà không
mất row**.

---

## Câu chưa trả lời được

1. `docs/` (nhánh cũ) và `.docs/` (nền hiện tại, snapshot theo version) đang cùng
   tồn tại. Chưa quyết cái nào là chuẩn.
2. 6 doc còn lại của nhánh cũ (`architecture.md`, `tree-layout.md`,
   `sync-durability.md`, `repo-layout.md`, `privacy.md`,
   `competitive-landscape.md`) mô tả kiến trúc Next/sql.js — **chưa viết lại** cho
   nền hiện tại. Đang nằm ở `archive/next-sqljs-260822`.
3. Backup ra file (`backup.ts` của nhánh cũ) chưa port: cần thêm đường đọc bytes
   file DB qua protocol của worker, là việc mới chứ không phải copy.
4. `relationships` của file cũ vẫn không có FK — xem mục 2.
