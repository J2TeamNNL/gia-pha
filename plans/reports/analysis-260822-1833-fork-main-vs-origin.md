# Fork `main` vs `origin/main` — so sánh để quyết stack nền

Ngày: 2026-08-22 · Merge base: `8ed7c2a` (2026-03-06) · Chưa sửa gì, chưa merge, chưa commit.

## 1. Kết luận ngắn

Đây là **fork kiến trúc**, không phải merge. Hai bên rẽ từ base 5 tháng trước.
Không tồn tại đường merge máy móc — `package.json`, runtime SQLite, test runner
và framework loại trừ nhau từng đôi một.

**Đề xuất: lấy `origin/main` làm nền, port 5 thứ từ local lên.** Lý do ở §5.

## 2. Kiểm chứng thực nghiệm (đã chạy, không suy đoán)

| | `main` local (Next + sql.js) | `origin/main` (Vite + sqlite-wasm/OPFS) |
|---|---|---|
| test | **86/86 PASS** (node:test, 11 file + 5 e2e spec) | **125/125 PASS** (vitest, 20 file + 2 e2e spec) |
| build | **PASS** (Next 16, 5 route static) | **PASS** (vite, 2312 module, wasm 864 kB) |
| lint | **FAIL 255 lỗi** — nhưng 100% trong `playwright-report/` (artifact sinh ra; ESLint flat config không đọc `.gitignore`). Source sạch. Fix = 1 dòng ignore. | **CLEAN, 0 output** |
| CI | không có `.github/` | có `.github/workflows/ci.yml` |

Cách kiểm bên remote: worktree detached tại `a2ea4c3` + `npm install` + chạy thật.

## 3. Bên remote hơn ở đâu

- **Runtime bền hơn.** OPFS + worker (`sqlite.worker.ts`, `protocol.ts`) thay sql.js + IndexedDB.
- **Migration runner đúng bài.** 5 migration có version (v1→v5), mỗi cái một transaction riêng, fail thì rollback và **giữ nguyên `user_version`** — không phá DB cũ.
- **Toàn vẹn bằng FK thật.** `FOREIGN KEY` + `PRAGMA foreign_keys = ON` mỗi connection + 1 trigger ngữ nghĩa. Sạch hơn 7 trigger của local — hợp lệ vì schema mới dựng lại từ migration chứ không ALTER bảng v0.x.
- **Đa thê đã xong.** `family_unions` / `family_partners` / `family_children`, có `status`, FK về `partial_dates` và `places`. CLAUDE.md ghi việc này "chặn tới Phase 2" — remote đã làm rồi.
- **Data model rộng hơn nhiều.** Thêm `places`, `events`, `import_batches`, `external_references`, `extension_payloads`, `branch_profiles`, `branch_roots`, `person_branch_links`.
- **Feature thật, có test:** xưng hô theo phương ngữ vùng (`kinship/dictionaries/` bac·trung·nam·quang-tri), branch profiles, **GEDCOM import đầy đủ** (tokenizer, ANSEL, dates, names, mapIndividual/mapFamily, loss report), **paste import từ spreadsheet**, graph layout trong worker + pan/zoom, relative list, SearchBox có a11y bàn phím, `exportFile` đã chặn CSV formula injection.
- Xưng hô theo phương ngữ chính là differentiator lõi theo `docs/culture-vietnam.md` — remote đã ship, local chưa có.

## 4. Bên local hơn ở đâu

- **Mô hình ngày ĐÚNG domain hơn.** `date_facts` của local có:
  - `is_leap_month` + CHECK chéo (`is_leap_month = 0 OR calendar = 'LUNAR_VN'`, và lunar thì `day <= 30`);
  - `kind = 'MEMORIAL'` — **ngày giỗ là fact hạng nhất**;
  - `CHECK (year IS NOT NULL OR month IS NOT NULL)` — cho phép giỗ **chỉ có tháng+ngày, không có năm**. Đây là insight domain thật.
  - `confidence`, và CHECK ràng `precision` với cột nào được NULL.
  - Remote `partial_dates` **có** `calendar IN ('GREGORIAN','LUNAR','OTHER')` + 6 mức `precision` + `source_text` + range — mạnh về độ trung thực khi import, **nhưng thiếu `is_leap_month`** (CLAUDE.md ghi bắt buộc) và thiếu ngữ nghĩa MEMORIAL; giỗ chỉ-tháng-ngày phải lách qua `source_text`.
- **`lunar-calendar.ts` 451 dòng** + 221 dòng test. Remote không có chuyển đổi âm lịch nào.
- **PWA** (manifest, `sw.js` 102 dòng, icons) + test soi `sw.js` không cache-first document/JS và không chạm IndexedDB. **Remote không có PWA.**
- `backup.ts` export/import ra file + e2e spec.
- Trigger bảo vệ **DB v0.x đang nằm trên máy người dùng** + bảng `relationships_quarantine` (cách ly row xấu, không xoá).
- **Kho tri thức `docs/` (8 file) + `plans/`** — decisions, culture-vietnam, tree-layout, privacy, roadmap, reports. Remote có `.docs/` versioned snapshot, nội dung khác.
- Test bắt được cạm bẫy thật: bản browser của sql.js **đổi tên `columns`** → đọc theo property là sai.

## 5. Vì sao remote nên làm nền

1. Remote đi trước về **runtime, migration, integrity, và feature breadth** — 19 commit, có CI, lint sạch, 125 test. Local là 2 commit docs/tooling + working tree chưa commit.
2. Commit `0af0d56` cho thấy migration sang Vite + OPFS là **quyết định có chủ ý**, kèm "fix review findings" — không phải tai nạn.
3. Phần local hơn đều **cộng thêm được** (additive): một cột + migration v6 cho `is_leap_month`, một hàm thuần cho âm lịch, PWA là file tĩnh. Ngược lại, port xưng hô + GEDCOM + paste + OPFS + union model sang Next/sql.js là viết lại gần hết.
4. **Quan trọng:** OPFS **không** giải quyết được việc iOS xoá storage sau 7 ngày. Chỉ cài PWA mới giải quyết. Nên PWA của local **vẫn cần** dù chọn nền nào — hai thứ bổ sung nhau, không xung đột.

## 6. Nếu chọn remote làm nền — việc phải làm

Port lên (theo thứ tự phụ thuộc):

1. **Migration v6: `is_leap_month`** vào `partial_dates`, kèm CHECK chéo và nới ràng buộc cho giỗ chỉ-tháng-ngày. Lấy CHECK từ `src/db/schema-v2.ts:131-146`.
2. **`src/lib/lunar-calendar.ts`** — hàm thuần, port nguyên; chuyển 221 dòng test sang vitest.
3. **PWA** — `src/app/manifest.ts` là API riêng của Next, phải viết lại thành manifest tĩnh cho Vite; `public/sw.js` phải trỏ lại asset của Vite (tên file có hash) và bỏ khai báo phiên bản sql.js.
4. **`backup.ts`** export/import file — đối chiếu với `exportFile.ts` của remote, giữ phần chặn CSV formula của remote.
5. **`docs/` + `plans/`** — hoà giải với `.docs/`. `docs/decisions.md` **phải** ghi lại quyết định đổi sang Vite/OPFS/npm/vitest, và CLAUDE.md phải sửa: hiện đang khẳng định sql.js · node:test · pnpm, cả ba sai sau merge.

Bỏ (không port):

- Next layout/`layout.tsx`, `manifest.ts` dạng Next — remote đã xoá `next.config.ts`.
- Chuyển pnpm và harness node:test — mâu thuẫn trực tiếp với remote. Giữ **case test** có giá trị, chuyển sang vitest.
- `src/lib/tree-layout.ts` (430 dòng) — remote `graph/layout.ts` + worker + `useGraphLayout` mạnh hơn.
- `migrate-storage.ts` — riêng cho IndexedDB, vô nghĩa trên OPFS.
- `schema-v2.ts` / `migrate-v2.ts` (670 dòng) — bị migration runner của remote thay thế; nhưng **khai thác lại các CHECK** ở mục 1.
- 7 trigger — FK của remote đã phủ DB mới. Chỉ port nếu migration thật sự phải nhận DB v0.x đang tồn tại.
- Test sql.js browser-build `columns` — không còn áp dụng khi bỏ sql.js.

## 7. Bẫy khi thực thi merge

- `playwright.config.ts` đang **untracked ở local VÀ có trong incoming** → merge bị chặn ngay. Phải xử lý trước.
- Remote **xoá** `src/app/layout.tsx`, local **sửa** → delete/modify conflict.
- `.gitignore` cả hai bên đều sửa.
- `CLAUDE.md`: local 153 dòng (commit `7fe12bf`), remote 82 dòng (mới thêm) → conflict chắc chắn.
- `src/db/persons.ts` `updatePerson` **nội suy tên cột không escape ở CẢ HAI bên** (remote: `persons.ts:120`). Merge không tự sửa — vẫn nợ, cần allowlist cột.
- CLAUDE.md hiện đã lệch với working tree: ghi "6 file test / 35 test", thực tế 11 file / 86 test; ghi union_id "chặn Phase 2", nhưng `schema-v2.ts` local đã có `unions`.

## 8. Câu hỏi chưa giải

1. Chọn nền nào? (§5 đề xuất remote)
2. `docs/` (local) vs `.docs/` (remote) — giữ cái nào làm chuẩn, hay gộp?
3. Remote migration v1 tên "Preserve prototype people and relationships" — **chưa kiểm** nó có thật sự đọc được DB v0.x trên máy người dùng hay không. Phải xác minh trước khi ship, vì đây là đường duy nhất phá dữ liệu thật.
4. `main` local ahead 2 commit — rebase drop, hay giữ làm branch lịch sử?
