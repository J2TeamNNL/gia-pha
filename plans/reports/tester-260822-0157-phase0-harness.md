# Phase 0 — test harness

Ngày 2026-08-22. Agent: fullstack-developer (vai tester theo brief).

## Đã tạo

- `package.json`: script `"test": "node --test \"tests/*.test.ts\""` (glob tường minh —
  `node --test tests/` KHÔNG hoạt động như directory arg trên Node 26.7, nó cố `require`
  "tests" như 1 module rồi lỗi `MODULE_NOT_FOUND`; `node --test` không args thì quét CẢ repo,
  dính cả `references/` (vitest import lỗi) và `test-exec.js` cũ). Cũng thêm `"type": "module"`
  ở root — an toàn vì không còn `.js`/`.cjs` nào ở root ngoài `node_modules`; xoá được warning
  `MODULE_TYPELESS_PACKAGE_JSON` khi `import` file `.ts` không đuôi `.mts`.
- `tsconfig.json`: thêm `"tests"` vào `exclude` — bắt buộc, không thì `pnpm build` FAIL vì Next
  typecheck theo `include: ["**/*.ts", ...]` vốn không loại `tests/`, và import `"../../src/db/schema.ts"`
  (có đuôi `.ts`, cần cho Node type-stripping) bị TS chê `allowImportingTsExtensions`.
- `tests/helpers/create-test-db.ts` — nạp `sql.js` với `public/sql-wasm.wasm` thật (3.49.1, cache
  module wasm 1 lần/process), `createTestDb()` trả DB in-memory mới đã chạy `initDatabaseSchema`
  thật mỗi lần gọi; `insertFixture()` ghi fixture bằng parameter binding (không nội suy chuỗi).
- `tests/fixtures/family-fixtures.ts` — 3 hàm fixture đúng docs/tree-layout.md §12, id xâu tay
  (không uuid) để dễ debug: `fixtureFourGrandparents` (7 người), `fixtureTwoSiblingsFourChildrenEach`
  (14 người), `fixtureOneHusbandThreeWivesNineChildren` (13 người). Mỗi hàm có docstring tiếng Việt.
- `tests/schema.test.ts`, `tests/constraints.test.ts`, `tests/fixtures.test.ts` — 18 test.
- Xoá `test-exec.js` (script nháp cũ, gây lỗi lint `no-require-imports`).

## Lệch so với brief — vì Phase 1A đã đổi `src/db/schema.ts` song song

Brief giả định `PRAGMA foreign_keys` CHƯA bật và bảo tôi `{ todo: true }` 4 constraint. Trong lúc
tôi đọc/viết, agent Phase 1A (song song) đã viết lại `src/db/schema.ts` — không còn API cũ
(`initDatabaseSchema(db): void`) mà đã có `initDatabaseSchema(db): SchemaInitResult`,
`enableForeignKeys(db)`, `SchemaMigrationError`, `SchemaTooNewError`, và quan trọng nhất: 3 trigger
chặn orphan-edge / tự-làm-cha-mình / chu trình được tạo NGAY trong `initDatabaseSchema`, ĐỘC LẬP
với `PRAGMA foreign_keys` (trigger còn phải chặn được cho DB v0.x không có `FOREIGN KEY` clause).
Tôi verify bằng script chạy thật (không đoán) trước khi viết test — xem code hiện tại của
`schema.ts`, không phải bản tôi đọc lúc đầu. Kết quả: **cả 4 constraint PASS thật hôm nay, không
cái nào cần `{ todo: true }`.** Theo luật "Verified Decisions" (đã verify bằng chạy code thật) tôi
viết test theo hiện trạng thật, không theo giả định cũ trong brief — nói rõ ở đây để review biết
tại sao không có `todo`.

Nếu `schema.ts` đổi tiếp trước khi Phase 1A merge xong, các test constraint có thể cần cập nhật lại
— đây là rủi ro cố hữu của việc test file đang được 1 agent khác sửa song song, không phải lỗi thiết
kế test.

## Test pass / todo

**18/18 PASS, 0 todo, 0 fail.**

- `schema.test.ts` (5): init idempotent + `user_version`, `isSchemaValid` true/false, `first_name`
  NOT NULL bị chặn, và fact SQLite đã verify: generated column vắng mặt ở `pragma_table_info`, có
  ở `table_xinfo` (tự dựng bảng scratch riêng, không phụ thuộc schema app).
- `constraints.test.ts` (5): `enableForeignKeys()` → pragma = 1; orphan edge chặn bởi trigger
  (KHÔNG cần gọi `enableForeignKeys` trước — cố ý test không gọi, để chứng minh trigger là lớp bảo
  vệ chính); tự-làm-cha-mình chặn; chu trình A→B→A chặn; xoá người còn quan hệ chặn
  (`trg_person_delete_guard`, ngoài phạm vi yêu cầu gốc nhưng cùng file trigger, thêm miễn phí).
- `fixtures.test.ts` (8): mỗi fixture — id không trùng, mọi relationship trỏ về person có thật,
  insert vào schema thật (có `enableForeignKeys`) không lỗi, đúng số người theo spec; thêm 2 test
  hình dạng riêng (chia con theo bà, đúng 4 con/anh-chị-em).

## Cách chạy

```bash
pnpm test    # node --test "tests/*.test.ts" — exit 0, in số pass/fail/todo cuối log
pnpm build   # Next typecheck — PASS, tests/ bị exclude khỏi tsconfig nên không lôi vào build
pnpm lint    # eslint — 0 lỗi (đã verify lại; 12 lỗi cũ trong CLAUDE.md có vẻ đã được dọn bởi
             #   agent khác song song — không phải việc của tôi, chỉ xác nhận tests/ tôi thêm sạch)
```

## Ghi chú kỹ thuật đáng lưu ý cho phase sau

- `node --test <dir>` (không glob) KHÔNG hoạt động trên Node 26.7 kiểu tôi kỳ vọng — phải dùng
  glob string `"tests/*.test.ts"`. Nếu thêm subdirectory test sau này (`tests/layout/*.test.ts`)
  phải sửa glob hoặc đổi sang `"tests/**/*.test.ts"` (chưa test glob 2 sao, generic tool `glob`
  built-in Node 22+ hỗ trợ `**` nhưng tôi không verify — báo trước cho Phase 1B).
- `createTestDb()`/`insertFixture()` trong `tests/helpers/` là API tái dùng cho Phase 1B (test
  `tree-layout.ts` thuần theo roadmap) — import fixture từ `tests/fixtures/family-fixtures.ts`,
  không cần chạm DB nếu chỉ test hàm layout thuần (chỉ cần `persons`/`relationships` object).
- Không thêm devDependency nào — zero-dep, dùng `node:test` + `node:assert/strict` built-in.

## Câu hỏi chưa giải

- `pnpm lint` báo 0 lỗi trong khi `docs/architecture.md`/`CLAUDE.md` ghi "12 lỗi" và vấn đề quét
  `.claude/worktrees/`. Có thể agent khác đã dọn trong lúc tôi làm — không verify lại nguồn, chỉ
  xác nhận trạng thái hiện tại xanh. Nên chạy lại `pnpm lint` sau khi Phase 1A/1B merge xong để
  chắc không có lỗi mới lẫn vào từ 2 nhánh đó.
- Có nên dời `enableForeignKeys()` test sang phía Phase 1A test (vì đó là hàm họ export) hay giữ ở
  đây (Phase 0 harness)? Tôi giữ ở đây vì brief yêu cầu 4 constraint cụ thể; nếu Phase 1A cũng viết
  test riêng cho `client.ts` gọi hàm này, có thể trùng lặp nhẹ — không phải vấn đề lớn (DRY ở mức
  test không bắt buộc nghiêm như code).

Status: DONE
Summary: Harness `node:test` + sql.js thật (wasm 3.49.1) dựng xong, 18/18 test pass (0 todo) vì
schema.ts của Phase 1A đã có trigger chặn đủ 4 ràng buộc độc lập PRAGMA. Build + lint đều xanh.
Concerns/Blockers: schema.ts đang được Phase 1A sửa song song — test có thể cần cập nhật nếu API
đổi tiếp trước khi merge. `pnpm lint` xanh bất ngờ so với ghi nhận cũ trong CLAUDE.md — chưa xác
minh nguyên nhân, nên lint lại sau khi các nhánh song song merge.
