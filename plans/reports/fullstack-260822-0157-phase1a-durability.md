# Phase 1A — bền vững dữ liệu · `src/db/`

Ngày 2026-08-22. Nguồn spec: `docs/sync-durability.md` §1–§4, `plans/roadmap.md` Phase 1A.
Kiểm chứng: script `verify-1a.mjs` (scratchpad), 27/27 PASS ở wasm 3.49.1 — engine app thật ship.

## Làm gì

| Mục roadmap | Trạng thái | Ở đâu |
|---|---|---|
| Export/import file lossless | xong | `src/db/backup.ts` + `src/components/backup-controls.tsx` |
| Bỏ `clearIndexedDB()` heuristic 5 cột → `PRAGMA user_version` | xong | `schema.ts`, `client.ts` |
| Lỗi đọc IndexedDB ≠ "chưa có dữ liệu" (3 trạng thái) | xong | `client.ts` `loadSnapshot()` |
| Thứ tự snapshot/persist | xong | `client.ts` `saveDb()` |
| Gộp 3 save/click thành 1 | xong | `client.ts` `saveDb()` coalescing |
| Memo promise thay vì memo kết quả | xong | `client.ts` `initPromise` |
| `BEGIN`/`COMMIT` mọi thao tác nhiều câu lệnh | xong | `persons.ts` `withTransaction()` |
| `PRAGMA foreign_keys = ON` mỗi connection + dọn row xấu | xong | `enableForeignKeys()`, `quarantineBadRows()` |
| `navigator.storage.persist()` | xong | `client.ts` `requestPersistentStorage()` |

Toàn bộ 9 mục Phase 1A. Không có mục nào bỏ lại.

## Quyết định phải ghi lại

**1. Không xoá row xấu — cách ly.** Bật `foreign_keys` trên DB đã có orphan edge làm mọi lần ghi
sau đó fail. Bản cũ sẽ `DELETE`. Ở đây row xấu chuyển sang bảng
`relationships_quarantine` kèm cột `reason` (`orphan-edge` / `self-relationship`) và
`quarantined_at`. Không mất gì, vẫn xem lại được.

**2. FK phải thay bằng trigger — đây là lỗ tôi tìm ra khi kiểm chứng, không phải trong spec.**
Bảng `relationships` của DB v0.x được tạo **không có mệnh đề `FOREIGN KEY`**, và SQLite
**không cho `ALTER TABLE ADD FOREIGN KEY`**. Nên `PRAGMA foreign_keys = ON` bảo vệ đúng
0% các DB đang tồn tại trên máy người dùng. Lần verify đầu FAIL đúng ở chỗ này.
Sửa: thêm trigger `trg_rel_person_exists_insert/update` — trigger thì `CREATE TRIGGER IF NOT
EXISTS` được vào bảng cũ, nên ràng buộc **như nhau** cho DB mới và DB cũ, mà **không phải
dựng lại bảng** (không phải di chuyển dữ liệu = không có bước phá huỷ nào).
Vẫn giữ mệnh đề `FOREIGN KEY` trong DDL bảng mới.

**3. Migration chỉ CỘNG THÊM.** `initDatabaseSchema()` sinh `ALTER TABLE ADD COLUMN` cho mọi
cột thiếu, từ cùng một bảng khai báo cột dùng để `CREATE TABLE` (một nguồn, không lệch).
DB v0.x thiếu 20 cột được bù đủ, 0 row mất. Thiếu **khoá chính** thì `throw
SchemaMigrationError` — dừng, không xoá, bảo người dùng export ra cứu thủ công.

**4. `first_name NOT NULL` giữ nghiêm ngặt ở DB mới.** Đường `ALTER` phải gắn `DEFAULT ''`
(SQLite từ chối thêm cột `NOT NULL` không default vào bảng có row), nhưng `CREATE TABLE`
của DB mới giữ `NOT NULL` trần. Verify có test riêng cho việc này.

**5. `table_xinfo` chứ không `table_info`.** Generated column vô hình với `pragma_table_info`
→ nếu dùng nó, migration sẽ `ADD COLUMN` trùng tên một cột đang tồn tại và fail.

## Ràng buộc bây giờ chặn được gì

Kiểm ở wasm 3.49.1 **và** host 3.51.0 (recursive CTE trong mệnh đề `WHEN` — cấu trúc lạ nhất,
chạy ở cả hai):

- tự làm cha/vợ chính mình — chặn, `trg_rel_no_self_*`
- orphan edge (trỏ tới người không tồn tại) — chặn, `trg_rel_person_exists_*` + FK
- chu trình cha–con **sâu bất kỳ** (p3→p1 khi đã có p1→p2→p3) — chặn, `trg_rel_no_cycle_*`
- chu trình tạo qua `UPDATE`, không chỉ `INSERT` — chặn
- xoá người còn cạnh — chặn, `trg_person_delete_guard` (phải xoá cạnh trước; `deletePerson`
  đã đúng thứ tự đó)
- `SPOUSE` hai chiều a→b và b→a — **cho phép**, đúng ý (không phải chu trình)

Trigger tạo theo thứ tự có ý nghĩa: SQLite bắn trigger **ngược** thứ tự tạo, nên trigger
"tự trỏ vào mình" tạo sau cùng để một cạnh a→a báo đúng nguyên nhân thay vì báo "chu trình".

## `saveDb()` — vì sao không còn ghi đè sai thứ tự

Bản cũ: `db.export()` ở dòng trên, `openIDB()` ở dòng dưới → thứ tự commit do timing mở
connection quyết định. Bản mới: hai biến `inFlight` / `queued`.
- Caller mới trong lúc chưa lấy snapshot → **gộp** vào lượt đang xếp hàng (3 save/click → 1 ghi).
- Snapshot lấy **đồng bộ ngay trước** khi ghi, trong lượt của mình, sau khi lượt trước xong
  → không có đường nào để bản cũ commit sau bản mới.
- Connection IndexedDB cache lại, không mở lại mỗi lần ghi.

## Export/import

`backup.ts` xuất **nguyên file SQLite**, không qua JSON → không mất cột/kiểu/bảng nào.
`user_version`, 7 trigger và bảng cách ly đều sống qua roundtrip (đã verify).

Luồng nhập cố tình 3 bước, không rút ngắn được:
1. mở file trong DB tạm, `isSchemaValid` + **đếm row** → verify TRƯỚC khi hỏi
2. tải cây hiện tại về máy làm bản an toàn (bỏ qua nếu cây đang rỗng)
3. mới thay thế

Người dùng thấy số người / số quan hệ của **cả hai** bên trong dialog xác nhận.

`SchemaTooNewError`: file do bản app mới hơn ghi → **từ chối mở**, không ghi gì.

## Verify

```bash
pnpm build
```

```bash
pnpm lint
```

`npx eslint src` → 0 lỗi (5 lỗi `any` cũ trong `persons.ts` đã hết luôn).
`npx tsc --noEmit` → `src/` sạch; lỗi còn lại thuộc `tests/` của nhánh Phase 0 đang chạy song song.
`pnpm build` hiện FAIL vì Next kéo `tests/` vào typecheck — thuộc phạm vi Phase 0, không phải 1A.

## Còn lại / bàn giao

- `src/components/backup-controls.tsx` đang giữ chuỗi hiển thị tại chỗ (`TODO(i18n)`) vì nhánh
  Phase 1B đang sở hữu `src/i18n/*`. Gộp vào i18n ngay khi 1B hợp nhất.
- Tầng UI phải hiển thị `StorageUnreadableError` / `SchemaTooNewError` / `SchemaMigrationError`
  chứ không rơi vào nhánh "cây rỗng" — đã gửi yêu cầu này cho nhánh 1B, chưa xác nhận xong.
- `updatePerson` vẫn nội suy **tên cột** không escape. Roadmap xếp Phase 2, và hàm hiện chưa
  được gọi ở đâu nên chưa có đường khai thác. **Không** sửa trong đợt này để giữ phạm vi.
- Bảng cách ly chưa có UI. Người dùng chưa thấy được row nào đã bị cách ly.
- `docs/sync-durability.md` §1–§3 vẫn mô tả hiện trạng CŨ. Cần cập nhật sau khi cả wave xong.

## Câu hỏi chưa giải

1. Cách ly row xấu có cần hiện cho người dùng ngay ở 1A không, hay để Phase 2 khi có UI
   "không suy được, cần user quyết"?
2. `trg_person_delete_guard` chặn xoá người còn cạnh. Có muốn `deletePerson` xoá cascade
   luôn cạnh (hiện đang vậy) hay bắt người dùng xác nhận từng cạnh?
