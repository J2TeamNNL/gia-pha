# Đồng bộ docs/ với hiện trạng sau Phase 0 + 1A + 1B

Ngày 2026-08-22. Agent: docs-manager.

## Verify trước khi sửa

```
pnpm test  → 34/34 PASS, 0 todo
pnpm lint  → 0 lỗi
pnpm build → PASS
```
`.claude/` không tồn tại trong repo (đã xoá). Đọc trực tiếp `src/db/schema.ts`, `client.ts`, `backup.ts`, `src/lib/tree-layout.ts`, `src/lib/drive.ts`, `src/db/persons.ts`, `src/store/treeStore.ts`, `package.json` để đối chiếu từng câu trong 3 report với code thật.

## Sửa gì ở đâu

### `docs/sync-durability.md` (90 → 102 dòng)
- §1 "hai đường mất dữ liệu độc lập" → đổi tên "ĐÃ SỬA", mô tả cách sửa thật (`initDatabaseSchema` cộng thêm, 3 trạng thái `loadSnapshot`), thêm sự thật mới: bảng `relationships` v0.x không có `FOREIGN KEY`, `ALTER TABLE ADD FOREIGN KEY` không được, ràng buộc thật do 7 trigger; cách ly thay xoá.
- §2 "không có đường thoát" → đổi thành "ĐÃ CÓ export/import file", mô tả `backup.ts` + luồng 3 bước + `SchemaTooNewError` + `persist()` đã gọi. Giữ nguyên: chưa phải PWA, `drive.ts` vẫn mock.
- §3 "ghi đè sai thứ tự" → "ĐÃ SỬA", mô tả `inFlight`/`queued` + memo promise.
- §4.5: câu mở "`grep BEGIN|COMMIT` → rỗng" đã SAI (nay có `withTransaction()`) — sửa thành "ĐÃ LÀM", giữ nguyên phần giới hạn atomicity (vẫn đúng).
- §6 "thứ tự làm": bước 1-3 → XONG, bước 4 → persist() xong / manifest+SW chưa, bước 5 chưa. Ghi rõ điểm lệch giữa quyết định gốc §4.4 ("ghi vào key IndexedDB mới") và cách Phase 1A thực làm (migrate tại chỗ) — giải thích vì sao vẫn không mâu thuẫn (chưa có service worker nào từng chạy).
- §4 (luật thiết kế, trừ 4.5 nói trên) và §5 (Drive sync) giữ nguyên theo yêu cầu.

### `docs/architecture.md` (117 → 121 dòng)
- Header: thêm nguồn 3 report mới.
- §2: bỏ "28 file trong `src/`. Không có test" (số file là inventory không nên hand-maintain) → thay bằng dòng test runner có nguồn.
- §3: "không có transaction" → có (`withTransaction`); "FK không bật" → bật nhưng bảo vệ thật do trigger (giải thích tại sao); `updatePerson`/`deletePerson` chưa persist — XÁC MINH LẠI, vẫn đúng, và làm rõ tên hàm trùng với store zustand (tránh nhầm — tự phát hiện khi verify, không có trong report gốc).
- §4: thêm `backup.ts`, `backup-controls.tsx`, `tree-layout.ts` vào cây module; ghi rõ tách layout xong, render/tương tác chưa tách.
- §5 bảng: dòng "Layout bằng d3-flextree" cập nhật trỏ tới `tree-layout.ts` hàm thuần.
- §6 Verify: `pnpm lint` 0 lỗi (không còn 12), giải thích 7 lỗi thật đã sửa + 5 lỗi từng đến từ `.claude/worktrees/` (nay `.claude/` không còn tồn tại); thêm `pnpm test`; sửa "chưa có test runner" (đã có).
- Kiểm chứng SQLite hai engine: giữ nguyên yêu cầu, thêm xác nhận recursive CTE trong `WHEN` chạy được cả hai engine (dùng thật trong 7 trigger).
- §7: dòng cuối về forest/anchor giả định — cập nhật đã sửa, có nguồn.

### `docs/tree-layout.md` (140 → 149 dòng)
- Header: thêm nguồn Phase 1B, tách rõ phần nào là số đo đối thủ (không đổi) vs phần đã sửa.
- §2 (3 lỗi hình học) → "ĐÃ SỬA", giữ mô tả lỗi cũ làm ngữ cảnh, thêm cách sửa + kết quả test.
- §3 (kiến trúc render) → gộp connector, EX_SPOUSE dashed riêng — ĐÃ SỬA.
- §5 (đa thê) → tách rõ: đã cải thiện (nhóm con đúng theo cha/mẹ ghi nhận) vs còn thiếu (`union_id`, cao độ riêng theo bà) — KHÔNG ghi quá phần đã làm.
- §7 (forest) → ĐÃ SỬA, mô tả `componentId`, anchor không chặn tính toán, không còn early-return rỗng.
- §8 (hiệu năng) → thêm 1 đoạn: `computeTreeLayout` đã là hàm thuần (tiền đề), nhưng memo/selector/flat-list vẫn CHƯA làm — không claim đạt 60fps.
- §11 (tách file) → cập nhật thực tế: `tree-layout.ts` xong (gồm cả connector, không tách file riêng `tree-connectors.ts` vì không có lợi); `tree-viewport.tsx` chưa tách vì tương tác chưa tồn tại.
- §12 (fixture) → bảng có cột trạng thái PASS; nút "Thêm Anh/Chị/Em" ghi orphan → ĐÃ SỬA (chặn trước khi ghi).
- §1, §4, §6, §9, §10 giữ nguyên — không bị Phase 0/1A/1B chạm tới (đo đối thủ, per-branch/LOD, người-đã-mất, tương tác, a11y đều chưa làm).

### `docs/decisions.md` (277 → 287 dòng)
- Thêm **D31** (mới): 2 quyết định từ Phase 1A — trigger thay dựng lại bảng để áp ràng buộc lên DB cũ; cách ly row xấu thay xoá. Theo đúng format D-số hiện có (decision + lý do + đánh đổi + nguồn report).

## Khẳng định đã bỏ (bug cũ nay không còn là hiện trạng)
- "2 đường mất dữ liệu độc lập" là hiện trạng
- "không có export/backup ở bất kỳ đâu"
- "ghi đè sai thứ tự do timing mở connection"
- "không có transaction, `grep BEGIN|COMMIT` → rỗng"
- "12 lỗi lint" / "chưa có test runner"
- 3 bug hình học layout (trùng toạ độ, subtree đè, offset lệch) là hiện trạng
- connector 1-path-mỗi-cạnh + EX_SPOUSE trông giống SPOUSE
- canvas rỗng khi không giải được anchor / giả định 1 anchor duy nhất
- nút "Thêm Anh/Chị/Em" ghi orphan rồi báo thành công

## Chỗ report lệch code / lệch quyết định gốc (đã ghi lại trong docs, không lờ đi)
1. **`docs/sync-durability.md` §4.4 vs thực làm**: quyết định gốc nói "v2 phải ghi vào key IndexedDB mới". Code thật (`client.ts`) vẫn dùng đúng 1 `DATA_KEY = "main"` cho mọi version — không đổi key. Không phải lỗi: lý do cần key mới (service-worker shell cũ chạy code cũ gọi `clearIndexedDB()`) chưa từng xảy ra vì **chưa từng có service worker nào chạy**. Đã ghi rõ trong §6 bước 2 và giữ §4.4 làm luật thiết kế cho **khi** PWA/service worker triển khai — không xoá luật, không giả vờ đã tuân theo.
2. **`updatePerson`/`deletePerson`**: cả 3 report không nói rõ có 2 hàm trùng tên (`src/db/persons.ts` ghi DB thật vs `src/store/treeStore.ts` state in-memory). Tự verify bằng `grep` thấy `FamilyTreeCanvas.tsx` gọi bản store, không phải bản DB — nên khẳng định cũ "updatePerson/deletePerson chưa được gọi ở đâu" (persist) **vẫn đúng**, nhưng dễ đọc nhầm nếu không phân biệt hai hàm. Đã thêm câu làm rõ trong `architecture.md` §3.
3. Số node trong bảng ví dụ ở `tree-layout.md` §2 (7 node / 12 node) lấy nguyên từ script nháp trong report 1B (không nằm trong repo, không phải từ `tests/tree-layout.test.ts` — số fixture trong test có thể khác). Đã giữ đúng số report ghi, không tự suy diễn khớp với fixture repo.

## Validation
- Link nội bộ: `sync-durability.md`, `architecture.md`, `tree-layout.md`, `decisions.md`, `culture-vietnam.md`, `privacy.md`, `competitive-landscape.md`, `repo-layout.md` đều tồn tại; anchor `decisions.md#d24` khớp heading `## D24` thật.
- Mọi khẳng định mới đọc trực tiếp từ `src/db/schema.ts`, `client.ts`, `backup.ts`, `src/lib/tree-layout.ts`, `src/db/persons.ts`, `src/store/treeStore.ts`, `package.json`, và chạy `pnpm test`/`lint`/`build` — không chỉ chép report.
- Không file nào vượt 800 dòng (102 / 121 / 149 / 287).

## Câu hỏi chưa giải (chuyển tiếp, không phải của docs-manager quyết)
- Bảng `relationships_quarantine` chưa có UI — roadmap cần quyết định phase nào làm.
- `trg_person_delete_guard` chặn xoá người còn cạnh — `deletePerson` có nên cascade cạnh hay bắt xác nhận từng cạnh (câu hỏi từ report 1A, chưa trả lời).
- Chủ unit 2-cha-mẹ chọn theo id nhỏ nhất (không theo giới) — ảnh hưởng thẩm mỹ hiển thị trục trái/phải, cần quyết định UX nếu muốn "cha luôn bên trái" là yêu cầu cứng (câu hỏi từ report 1B).

Status: DONE
Summary: Đã đồng bộ 3 file evergreen (`sync-durability.md`, `architecture.md`, `tree-layout.md`) với hiện trạng thật sau Phase 0/1A/1B, mọi bug đã sửa được ghi là ĐÃ SỬA kèm nguồn report có ngày, phần chưa làm giữ nguyên là chưa làm; thêm D31 vào `decisions.md` cho 2 quyết định thiết kế mới (trigger thay FK, cách ly thay xoá).
Concerns/Blockers: không có — 3 điểm lệch đã tìm thấy đều được ghi lại trong docs (không phải blocker, chỉ là nuance cần biết).
