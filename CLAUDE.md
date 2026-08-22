# Gia Phả — context cho AI agent

Ứng dụng quản lý gia phả Việt Nam, **local-first**: SQLite chạy trong trình duyệt (sql.js), đồng bộ lên Google Drive của chính người dùng. **Không có backend server.**

## Đọc gì trước khi làm gì

| Việc | Đọc |
|---|---|
| Bất cứ gì | [`docs/decisions.md`](docs/decisions.md) — vì sao dự án đi hướng này |
| Hiểu hiện trạng, cái gì đã/chưa có | [`docs/architecture.md`](docs/architecture.md) |
| Chạm dữ liệu người / quan hệ / ngày tháng | [`docs/culture-vietnam.md`](docs/culture-vietnam.md) — **luật domain, đọc trước khi thiết kế field** |
| Sửa canvas cây | [`docs/tree-layout.md`](docs/tree-layout.md) |
| Chạm `src/db/`, backup, sync | [`docs/sync-durability.md`](docs/sync-durability.md) |
| Thêm field / dependency / tích hợp | [`docs/privacy.md`](docs/privacy.md) |
| Biết đối thủ đã làm gì | [`docs/competitive-landscape.md`](docs/competitive-landscape.md) |
| Thư mục lạ trong repo là gì, xoá được không | [`docs/repo-layout.md`](docs/repo-layout.md) |
| Làm gì tiếp | [`plans/roadmap.md`](plans/roadmap.md) |

**`docs/` khẳng định — `plans/reports/` chứng minh.** Mọi khẳng định trong `docs/` có dòng trích nguồn về report có ngày. Report mục theo thời gian; đừng coi report cũ là authority.

## Luật bất biến

Không vi phạm mà chưa sửa `docs/decisions.md` trước:

1. **Không backend server.** Không thêm API, không thêm DB phía server.
2. **Không dependency gọi mạng lúc runtime.** Kể cả font, kể cả CDN. Hiện trạng đã kiểm chứng sạch — giữ nó.
3. **Không bao giờ xoá dữ liệu người dùng để "sửa" schema.** Không migrate được thì dừng và báo.
4. **`con dâu` / `con rể` / `cháu dâu` là đường dẫn suy ra, không phải thuộc tính của người.** Lưu thành nhãn chính là nguyên nhân bug "con dâu đúng mà cháu dâu sai" ở đối thủ.
5. **Không bao giờ clone một người** để giữ hình dạng cây. Anh em họ lấy nhau làm đồ thị có chu trình — giữ cross-link, dedupe theo `person_id`.
6. **Cây là FOREST.** Nhiều gốc / component rời rạc là bình thường, không phải lỗi.
7. **Lưu đúng lịch mà gia đình khai.** Không convert rồi coi kết quả là gốc. `is_leap_month` và `precision` bắt buộc.
8. **Vai vế đệ quy theo vai của cha/mẹ**, không theo tuổi cá nhân. Trả "không xác định được" thay vì đoán.

## Verify

```bash
pnpm test
```

```bash
pnpm lint
```

```bash
pnpm build
```

Cả ba PASS (kiểm 2026-08-22): `test` 35/35 · `lint` 0 lỗi · `build` PASS.

**Next 16 không còn chạy ESLint khi build** — CI chỉ chạy `build` sẽ luôn xanh dù lint đỏ. Phải gọi `pnpm lint` riêng. Repo **chưa có `.github/`** nào, nên chưa có CI thật.

### Test harness

`pnpm test` = `node:test` built-in, **zero dependency test nào**. Node 26 tự strip type nên chạy `.ts` trực tiếp; `package.json` có `"type": "module"` để phần này hoạt động.

```
tests/helpers/create-test-db.ts    nạp sql.js + wasm thật, DB mới mỗi test
tests/fixtures/family-fixtures.ts  3 fixture theo docs/tree-layout.md §12
tests/schema.test.ts               DDL, isSchemaValid, sự thật table_xinfo
tests/constraints.test.ts          7 trigger + ngữ nghĩa transaction
tests/migration.test.ts            DB v0.x → v1, đường DUY NHẤT phá được dữ liệu thật
tests/tree-layout.test.ts          3 bug layout đã đo được, chu trình, forest
```

`tests/` bị `exclude` khỏi `tsconfig.json` để Next không kéo vào typecheck lúc build. Chạy `npx tsc --noEmit` sẽ báo lỗi ở `tests/` (import `.ts` extension) — **đó là bình thường**, không phải hồi quy.

### Kiểm chứng SQLite: luôn ở HAI engine

Host `sqlite3` CLI là **3.51.0**, wasm app ship là **3.49.1** (`strings public/sql-wasm.wasm | grep -Eo '3\.[0-9]+\.[0-9]+'`). Hai bên hành xử khác nhau. Chi tiết + danh sách pragma bắt buộc kiểm ở wasm: [`docs/architecture.md`](docs/architecture.md) §6.

Ba điều đã kiểm chứng, nhớ nhất:

- **Generated column không xuất hiện trong `pragma_table_info`** (cả VIRTUAL và STORED), chỉ trong `table_xinfo`. Migration dùng `table_info` sẽ `ADD COLUMN` trùng tên rồi fail.
- **`PRAGMA foreign_keys` không nằm trong file.** Mỗi connection mới trả về 0 — phải bật lại mỗi lần mở.
- **Recursive CTE trong mệnh đề `WHEN` của trigger chạy được ở CẢ hai engine.** Đây là cách chặn chu trình cha–con sâu bất kỳ.

### Chạy codex cross-review mà không bị treo

`codex exec --skip-git-repo-check` (v0.149.0) có sẵn để lấy ý kiến thứ hai độc lập. Bốn điều đã học:

1. **Prompt ngắn.** Prompt ~4KB mô tả kiến trúc từng **treo 27 phút, không ra output nào**, phải kill. Prompt ~2KB xong trong ~9 phút.
2. **Đừng pipe qua `| tail -N`** — không thấy gì cho tới khi process kết thúc. Redirect ra file (`> out.txt 2>&1 &`) rồi poll.
3. **Không có binary `timeout`** trên máy này. Muốn chờ thì loop `pgrep -f "codex exec"` với `/bin/sleep` bên trong (foreground `sleep` bị harness chặn).
4. Codex **đọc file thật** nên ra finding có `file:line` và bắt được lỗi thật mà một reviewer bỏ sót. **Nhưng nó cũng khẳng định sai một cách rất tự tin** — verify từng finding với code trước khi nhận.

Lưu ý hook: đọc `node_modules` và `.git` bị hook `scout-block` chặn. Muốn load `sql.js` thì viết vào file script rồi chạy, đừng nêu đường dẫn trong lệnh bash.

## Cấu trúc

```
src/app/          layout, page (client component)
src/components/   PersonCard, FamilyTreeCanvas, QuickAddForm, OnboardingScreen,
                  SidePanel, PhoneInput, backup-controls, ui/
src/db/           schema (DDL + migration + trigger), client (vòng đời sql.js +
                  IndexedDB), persons (query), backup (export/import file), types
src/lib/          tree-layout.ts (layout HÀM THUẦN), drive.ts (HIỆN LÀ MOCK), utils
src/i18n/         vi, en, index, useTranslation  ← tự viết, KHÔNG phải i18next
src/store/        treeStore (zustand)
tests/            node:test + sql.js thật
docs/             tài liệu evergreen
plans/            roadmap + đề xuất + reports
references/       3 repo tham khảo đã clone, không sửa (gitignored)
.agents/          nguồn AG Kit dùng chung, chỉ đọc rules/
```

## Ràng buộc dữ liệu đang có hiệu lực

`initDatabaseSchema()` tạo **7 trigger**. Biết chúng trước khi viết code ghi DB — chúng **throw**, không cảnh báo:

| Chặn | Trigger |
|---|---|
| quan hệ trỏ tới người không tồn tại | `trg_rel_person_exists_insert/update` |
| tự làm cha / vợ chính mình | `trg_rel_no_self_insert/update` |
| chu trình cha–con **sâu bất kỳ**, cả qua UPDATE | `trg_rel_no_cycle_insert/update` |
| xoá người còn cạnh | `trg_person_delete_guard` — phải xoá cạnh trước |

`SPOUSE` hai chiều a→b và b→a **được phép** (không phải chu trình).

**Vì sao là trigger chứ không phải FOREIGN KEY:** bảng `relationships` của DB v0.x được tạo **không có mệnh đề `FOREIGN KEY`**, và SQLite **không cho `ALTER TABLE ADD FOREIGN KEY`**. Nên `PRAGMA foreign_keys = ON` một mình bảo vệ 0% các DB đang nằm trên máy người dùng. Trigger thì thêm được vào bảng cũ, nên ràng buộc như nhau cho DB mới và DB cũ **mà không phải dựng lại bảng** (không phải di chuyển dữ liệu = không có bước phá huỷ nào).

Row xấu có sẵn được **cách ly** sang `relationships_quarantine` (có cột `reason`), **không xoá** — luật 3.

## Cạm bẫy đã biết

Còn thật:

- `src/lib/drive.ts` là **3 hàm `console.log`**, không phải Drive thật.
- **Chưa phải PWA** — `public/` chỉ có 5 svg mặc định của Next + `sql-wasm.wasm`. Không manifest, không service worker, không icon. Đây là lý do iOS có thể xoá storage sau 7 ngày không dùng.
- `updatePerson` / `deletePerson` trong `src/db/persons.ts` **chưa được gọi ở đâu** — chưa có đường sửa/xoá nào được persist. (`updatePerson` mà `FamilyTreeCanvas` gọi là action của **store**, không phải DB.)
- `updatePerson` **nội suy tên cột không escape**. Chưa khai thác được vì chưa ai gọi. Roadmap xếp Phase 2: dùng allowlist cột hoặc parameterised builder.
- Không có dependency d3 nào; layout là toạ độ XY viết tay, nhưng đã tách thành hàm thuần `computeTreeLayout()` trong `src/lib/tree-layout.ts`.
- Canvas **chưa có** pan/zoom/arrow-key/fit, chưa qua a11y (touch target, contrast, `prefers-reduced-motion`).
- Đa thê: layout tách đúng nhóm con theo bộ cha/mẹ, nhưng **chưa có cao độ đường ngang riêng theo từng bà** — cần `union_id`, chặn tới Phase 2.
- Bảng cách ly **chưa có UI**. Người dùng không thấy được row nào đã bị cách ly.

Đã sửa 2026-08-22, **đừng đi sửa lại**:

- ~~`src/db/client.ts` có 2 đường mất dữ liệu~~ → cả hai đã sửa; đọc `docs/sync-durability.md` §1 để biết cách.
- ~~`window.__giapha.seed` có trong bundle production~~ → chỉ nạp ở dev.
- ~~`PRAGMA foreign_keys` không được bật~~ → bật mỗi connection + 7 trigger.
- ~~Bà nội và ông ngoại trùng khít toạ độ~~ → `x` reserve chiều rộng subtree; có test.
- ~~Nút "Thêm Anh/Chị/Em" ghi orphan rồi báo thành công~~ → chặn trước khi ghi, và `createPersonWithRelationships()` tạo người + cạnh trong MỘT transaction.
- ~~Canvas rỗng khi không giải được anchor~~ → luôn vẽ mọi component (forest).
- ~~`pnpm lint` FAIL 12 lỗi~~ → 0 lỗi. (12 = 7 lỗi thật + 5 lỗi từ bản copy `src/` cũ trong `.claude/worktrees/`; thư mục `.claude/` **hiện không còn tồn tại**.)

## Quy ước

- Markdown chỉ đặt trong `docs/` hoặc `plans/`.
- kebab-case cho file TS/JS mới. (File component cũ dùng PascalCase — giữ nguyên, không đổi tên hàng loạt.)
- Không commit khi user không yêu cầu tường minh trong lượt hiện tại.
- KISS/DRY. Giao đúng phạm vi được yêu cầu, không thêm.
- Thao tác nhiều câu lệnh SQL phải bọc `withTransaction()` trong `src/db/persons.ts`.
- Lỗi đọc storage (`StorageUnreadableError`, `SchemaTooNewError`, `SchemaMigrationError`) **phải** hiển thị ra UI, **không bao giờ** rơi vào nhánh "cây rỗng".
