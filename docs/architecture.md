# Kiến trúc

> Trạng thái kiểm chứng: 2026-08-22. Mọi mục "chưa có" dưới đây đã được xác nhận bằng cách đọc code, chạy `pnpm build` / `pnpm lint` / `pnpm test`, và `grep`. Nguồn ban đầu: `plans/reports/reviewer-260821-2312-architecture-state.md`, `reviewer-260821-2312-sync-security-pwa.md`. Cập nhật sau Phase 0/1A/1B: `plans/reports/tester-260822-0157-phase0-harness.md`, `plans/reports/fullstack-260822-0157-phase1a-durability.md`, `plans/reports/fullstack-260822-0157-phase1b-canvas.md`.

## 1. Triết lý

- **Local-first** — không backend server. Dữ liệu gia phả nằm trong trình duyệt của người dùng.
- **Privacy core** — không dữ liệu nào tới máy chủ bên thứ ba mà người dùng không kiểm soát.
- **Zero-setup** — người dùng không phải tạo project Supabase, không phải deploy, không phải cấu hình gì. Đây là lợi thế cạnh tranh rõ nhất; xem [competitive-landscape.md](competitive-landscape.md).
- **Offline capable** — mục tiêu, **chưa đạt** (xem §5).

## 2. Stack thực tế

| Lớp | Dùng gì | Ghi chú |
|---|---|---|
| Framework | Next.js 16.1.6, App Router, `output: "export"` (`next.config.ts:3`) | static export, build ra `out/` |
| UI | React 19.2.3, TypeScript 5, Tailwind v4 | |
| Component | `radix-ui` + shadcn/ui | 3 file trong `src/components/ui/` (dialog, form, card) **chưa được dùng** — `SidePanel` tự viết lại hành vi dialog |
| Animation | framer-motion 12 | hiện chỉ dùng cho `drag` trên canvas |
| Form | react-hook-form 7 + zod 4 | |
| State | zustand 5 (`src/store/treeStore.ts`) | |
| DB | **sql.js 1.14** — SQLite biên dịch sang WebAssembly, chạy trong browser | `public/sql-wasm.wasm` serve từ origin của mình, không CDN |
| Persistence | IndexedDB (`src/db/client.ts`) | bản export toàn bộ file DB, ghi theo 1 key |
| i18n | **tự viết** — `src/i18n/{vi,en}.ts` + `useTranslation` | KHÔNG dùng i18next. Key set VI/EN đồng bộ do compiler ép (`en.ts:4`) |
| Icons | lucide-react | |

**Test runner**: `node:test` built-in, không thêm devDependency (`pnpm test` → `node --test "tests/*.test.ts"`). Xem §6.

## 3. Luồng dữ liệu

```
User action
   ↓
component  →  src/db/persons.ts  (SQL)  →  sql.js in-memory DB
   ↓                                            ↓
zustand store                          db.export() → IndexedDB
   ↓
FamilyTreeCanvas gọi computeTreeLayout() (src/lib/tree-layout.ts) → render HTML card + SVG connector
```

Đặc điểm cần biết:

- **Mỗi lần ghi là một lần export TOÀN BỘ file DB** (`saveDb()` trong `client.ts`) — vẫn đúng, nhưng giờ nhiều lần gọi liên tiếp gộp thành một lần ghi thật (coalescing) và snapshot lấy đúng thứ tự. Chi tiết + nguồn: [sync-durability.md](sync-durability.md) §3.
- **Có transaction.** `withTransaction()` (`src/db/persons.ts`) bọc `BEGIN`/`COMMIT` cho mọi thao tác nhiều câu lệnh. Nguồn: `plans/reports/fullstack-260822-0157-phase1a-durability.md`.
- **`PRAGMA foreign_keys` được bật mỗi connection** (`enableForeignKeys()`), nhưng vì bảng `relationships` của DB v0.x không có mệnh đề `FOREIGN KEY` (SQLite không cho `ALTER TABLE ADD FOREIGN KEY`), ràng buộc thật cho cả DB mới và DB cũ do **7 trigger** trong `initDatabaseSchema()` đảm nhiệm. Orphan edge, tự làm cha mình, chu trình cha–con (qua `INSERT` hoặc `UPDATE`) đều bị chặn; `SPOUSE` hai chiều a↔b vẫn được phép. Chi tiết + nguồn: [sync-durability.md](sync-durability.md) §1.
- `updatePerson` / `deletePerson` trong `src/db/persons.ts` (hàm ghi DB) **vẫn chưa được gọi ở đâu ngoài chính file đó** — chưa có đường sửa/xoá nào được persist. (Store zustand `treeStore.ts` cũng có `updatePerson`/`deletePerson` cùng tên, nhưng đó là state in-memory thuần, không chạm DB — đừng nhầm hai hàm.) Xác minh: `grep -rn "updatePerson\|deletePerson" src/` ngoài `persons.ts` chỉ khớp `treeStore.ts` và `FamilyTreeCanvas.tsx` (gọi bản store).

## 4. Ranh giới module

```
src/
  app/          layout, page (client component), globals.css
  components/   PersonCard, FamilyTreeCanvas, QuickAddForm, backup-controls,
                OnboardingScreen, SidePanel, PhoneInput, ui/
  db/           schema (DDL + migration + trigger), types, client (sql.js
                lifecycle), persons (query, transaction), backup (export/import)
  lib/          drive.ts (MOCK), tree-layout.ts (hàm thuần tính toạ độ), utils.ts
  i18n/         vi, en, index, useTranslation
  store/        treeStore (zustand)
```

`FamilyTreeCanvas.tsx` đã tách phần **tính layout** ra `src/lib/tree-layout.ts` (hàm thuần `computeTreeLayout()`, không import React — xem [tree-layout.md](tree-layout.md)). Phần còn lại (render + tương tác: pan/zoom/keyboard, a11y) vẫn ở trong component và **chưa tách** — xem [tree-layout.md](tree-layout.md) §11 cho phần còn thiếu.

## 5. CHƯA CÓ — dù tài liệu cũ nói là có

Mục này tồn tại vì `README.md` và `.plan/01-architecture.md` từng khẳng định những thứ dưới đây **đã có**. Không có cái nào tồn tại.

| Tài liệu cũ nói | Thực tế |
|---|---|
| "PWA Ready", cài được trên iOS/Android | `public/` chỉ có 5 svg mặc định của Next + `sql-wasm.wasm`. **Không manifest, không service worker, không icon.** `layout.tsx:7-11` không khai báo gì |
| "load siêu nhanh từ Service Worker" | không có service worker |
| Google Drive sync | `src/lib/drive.ts` là **3 hàm `console.log`**. Không có `googleapis`, không có OAuth |
| Google Photos API | chưa có |
| "file `.sqlite` đã mã hoá" | không có mã hoá |
| Layout bằng `d3-flextree` | không có dependency d3 nào. Layout là toạ độ XY viết tay, hàm thuần trong `src/lib/tree-layout.ts` (xem [tree-layout.md](tree-layout.md)) |
| i18n bằng `i18next` | tự viết, xem §2 |
| Background silent upload sau debounce 5-10s | **không khả thi về nguyên lý** — client browser-only public OAuth không giữ được refresh token. Xem [sync-durability.md](sync-durability.md) |
| Changelog v0.5: pan/zoom/arrow-key "Added" | `grep onWheel\|keydown\|scale(\|onTouch` trong `src/` → **0 hit**. Canvas vẫn là `motion.div drag` của v0.4 |

## 6. Verify

> Nguồn: `plans/reports/tester-260822-0157-phase0-harness.md`, `plans/reports/fullstack-260822-0157-phase1a-durability.md`.

```bash
pnpm build   # PASS — Next 16 Turbopack, static export, 4 page, TypeScript sạch
pnpm lint    # PASS — 0 lỗi
pnpm test    # PASS — node --test "tests/*.test.ts", 35/35, 0 todo
```

Ba điều phải biết:

1. **Next 16 không còn chạy ESLint khi build.** CI chỉ chạy `build` sẽ luôn xanh dù lint đỏ. Muốn gate thì phải gọi `pnpm lint` riêng.
2. `pnpm lint` **0 lỗi** — 7 lỗi thật trong `src/` đã sửa trong Phase 1A/1B (bao gồm 5 lỗi `any` cũ trong `persons.ts`); 5 lỗi còn lại từng đến từ một bản copy `src/` cũ lồng trong `.claude/worktrees/…`. **`.claude/` hiện không còn tồn tại trong repo** (đã xoá) — không còn gì để lint trùng. Chi tiết cấu trúc: [repo-layout.md](repo-layout.md).
3. `node --test <thư mục>` (không glob) **không hoạt động** như mong đợi trên Node 26.7 — phải dùng glob string tường minh (`"tests/*.test.ts"`), xem `package.json`.

### Kiểm chứng SQLite phải làm ở HAI engine

Host `sqlite3` CLI **khác phiên bản** với wasm mà app thực sự ship:

```bash
sqlite3 --version                                        # host: 3.51.0
strings public/sql-wasm.wasm | grep -Eo '3\.[0-9]+\.[0-9]+'  # app ship: 3.49.1
```

Hai engine **hành xử khác nhau**, nên mọi DDL / CHECK / trigger / PRAGMA phải verify ở **cả hai** trước khi viết vào tài liệu. Những thứ bắt buộc kiểm ở wasm:

- recursive CTE **bên trong** `WHEN` của trigger — đã kiểm chứng chạy được ở cả hai (dùng thật trong 7 trigger ràng buộc của `initDatabaseSchema()`, cấu trúc lạ nhất trong đó). Nguồn: `plans/reports/fullstack-260822-0157-phase1a-durability.md`.
- `PRAGMA foreign_keys` — **reset về 0 ở mỗi connection mới**, và là **no-op khi đang trong transaction**
- `PRAGMA user_version` có sống qua `db.export()` rồi mở lại hay không
- ngữ nghĩa `ROLLBACK`

Một kết quả đã kiểm chứng và đáng nhớ: **generated column (cả `VIRTUAL` và `STORED`) không bao giờ xuất hiện trong `pragma_table_info`**, chỉ có trong `table_xinfo`. Nên **không dùng được** generated column làm shim tương thích cho code đang sniff tên cột — `src/db/schema.ts` dùng `table_xinfo` trong hàm phát hiện cột đang có, để không bao giờ "thấy thiếu" một cột generated đang tồn tại. Có test giữ sự thật này: `tests/schema.test.ts`.

Cách làm: dựng DB nháp trong scratchpad (**không** trong repo), chạy DDL thật, rồi tấn công từng ràng buộc bằng những row đáng lẽ phải bị từ chối. Dán output thật vào tài liệu; cái gì chưa chạy thì gắn cờ `[INFERENCE]`.

## 7. Ràng buộc khi mở rộng

- **Mọi tính toán phải làm được ở client.** Không được thêm dependency gọi mạng lúc runtime — kể cả font, kể cả CDN. Hiện trạng đã kiểm chứng sạch: không analytics, không CDN, `next/font` self-host lúc build, zero external URL trong `src/`. Xem [privacy.md](privacy.md).
- **Chuyển đổi âm–dương lịch** phải dùng thư viện bundle offline, pin version. Xem [culture-vietnam.md](culture-vietnam.md).
- **Cây gia phả là FOREST, không phải tree.** Nhiều gốc / component rời rạc là trạng thái bình thường. `computeTreeLayout()` (`src/lib/tree-layout.ts`) đã sửa: render được nhiều component rời rạc, `anchorId` chỉ ảnh hưởng THỨ TỰ ưu tiên, không còn early-return "canvas rỗng" khi không giải được anchor. Nguồn: `plans/reports/fullstack-260822-0157-phase1b-canvas.md`.
