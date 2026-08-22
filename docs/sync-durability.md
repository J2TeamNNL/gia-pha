# Bền vững dữ liệu và đồng bộ

> Kiểm chứng: 2026-08-22. §1–§3, §6 cập nhật theo `plans/reports/fullstack-260822-0157-phase1a-durability.md` (Phase 1A, đã chạy `pnpm test` 35/35 PASS). §4, §5, §7 giữ nguồn cũ: `plans/reports/reviewer-260821-2312-sync-security-pwa.md`, `reviewer-260821-2312-architecture-state.md`, `reviewer-260821-2312-data-model-db.md`.
>
> **Đây là tài liệu quan trọng nhất về mặt rủi ro.** Gia phả là dữ liệu không thể tạo lại. Người dùng sẽ tha thứ một nhãn xưng hô sai. Họ sẽ bỏ app làm mất 10 năm ghi chép dòng họ.

## 1. Hai đường mất dữ liệu độc lập — ĐÃ SỬA

> Nguồn: `plans/reports/fullstack-260822-0157-phase1a-durability.md`.

Cả hai đều nằm trong `src/db/client.ts`.

**Đường 1 — xoá vì tưởng schema sai.** Đã bỏ hẳn `clearIndexedDB()` theo heuristic 5 cột. Thay bằng `PRAGMA user_version` + `initDatabaseSchema()` (`src/db/schema.ts`): danh sách cột là **một nguồn duy nhất** dùng cho cả `CREATE TABLE` và `ALTER TABLE ADD COLUMN`, nên migration chỉ **cộng thêm**. DB v0.x thiếu cột → bù đủ, 0 row mất. Thiếu **khoá chính** (không migrate được mà không phá dữ liệu) → `throw SchemaMigrationError`, dừng và báo, không xoá.

**Đường 2 — không cần xoá vẫn mất.** `loadSnapshot()` (`client.ts`) giờ trả một trong ba trạng thái tường minh: `data` · `empty` · `unreadable`. `unreadable` (lỗi đọc IndexedDB, hoặc key có tồn tại nhưng nội dung sai kiểu/rỗng) ném `StorageUnreadableError` và **không ghi gì** — không còn nhánh nào tạo DB rỗng rồi `put` lên đúng key cũ khi đọc lỗi.

**Sự thật mới phát hiện khi verify (không có trong spec gốc):** bảng `relationships` của DB v0.x được tạo **không có mệnh đề `FOREIGN KEY`**, và SQLite **không cho `ALTER TABLE ADD FOREIGN KEY`**. Nên `PRAGMA foreign_keys = ON` (`enableForeignKeys()`) một mình bảo vệ **0%** các DB đang tồn tại trên máy người dùng — pragma này còn reset về 0 ở mỗi connection mới. Ràng buộc thật hiện do **7 trigger** trong `initDatabaseSchema()` đảm nhiệm (`trg_rel_no_cycle_insert/update`, `trg_rel_person_exists_insert/update`, `trg_person_delete_guard`, `trg_rel_no_self_insert/update`) — `CREATE TRIGGER IF NOT EXISTS` thêm được vào bảng cũ, không cần dựng lại bảng (không di chuyển dữ liệu = không có bước phá huỷ). DDL bảng mới vẫn giữ mệnh đề `FOREIGN KEY` cho rõ ý định.

Row đã tồn tại mà phạm ràng buộc (orphan edge trỏ tới người không có, hoặc tự làm cha/vợ chính mình) được **cách ly** sang bảng `relationships_quarantine` khi migrate (cột `reason`: `orphan-edge` / `self-relationship`, cột `quarantined_at`) — **không xoá**. Bảng cách ly chưa có UI hiển thị cho người dùng.

## 2. Đường thoát — ĐÃ CÓ export/import file

> Nguồn: `plans/reports/fullstack-260822-0157-phase1a-durability.md`.

`src/db/backup.ts` xuất **nguyên file SQLite** (`db.export()`), không qua JSON trung gian — không mất cột/kiểu/bảng nào; `user_version`, 7 trigger và bảng cách ly đều sống qua roundtrip.

Luồng nhập cố tình 3 bước, không rút ngắn: (1) mở file trong DB tạm, verify bằng `isSchemaValid()` + đếm row **trước khi hỏi**; (2) tải cây hiện tại về máy làm bản an toàn (bỏ qua nếu cây đang rỗng); (3) mới thay thế (`replaceDb()`). File do bản app **mới hơn** ghi ra (`schemaVersion` lớn hơn bản đang chạy) bị từ chối mở (`SchemaTooNewError`), không ghi gì.

`navigator.storage.persist()` đã được gọi (`requestPersistentStorage()`, sau mỗi lần mở DB thành công).

**Vẫn chưa phải PWA** — không manifest, không service worker, không icon (`public/` chỉ có 5 svg mặc định của Next + `sql-wasm.wasm`). Tới khi có bước PWA (§6 bước 4), cơ chế WebKit xoá storage sau 7 ngày không dùng vẫn là rủi ro thật, chỉ giảm nhẹ bởi `persist()`.

`src/lib/drive.ts` vẫn là 3 hàm `console.log`. Chưa có backup ngoài trình duyệt/file tải về tay.

## 3. Ghi đè sai thứ tự — ĐÃ SỬA

> Nguồn: `plans/reports/fullstack-260822-0157-phase1a-durability.md`.

`saveDb()` (`client.ts`) giờ dùng hai biến `inFlight` / `queued`: caller mới trong lúc chưa lấy snapshot **gộp** vào lượt đang xếp hàng (3 save/click bắn liên tiếp giờ thành 1 lần ghi); snapshot lấy **đồng bộ ngay trước khi ghi**, trong lượt của chính mình, sau khi lượt trước xong xuôi — không còn đường nào để bản cũ commit sau bản mới. Kết nối IndexedDB (`openIDB()`) được cache lại, không mở lại mỗi lần ghi.

`getDb()` giờ memo hoá **promise khởi tạo** (`initPromise`), không memo kết quả — double-init lúc mount (`Promise.all` gọi hai lần) không còn tạo hai instance độc lập ghi đè nhau.

## 4. Luật thiết kế

### 4.1 Không bao giờ xoá dữ liệu người dùng để "sửa" schema
Thay `clearIndexedDB()` bằng `PRAGMA user_version` + migration thật. Nếu không migrate được thì **dừng và báo**, không xoá.

### 4.2 Lỗi đọc storage không bao giờ được hiểu là "chưa có dữ liệu"
Phân biệt ba trạng thái: *có dữ liệu* · *chắc chắn chưa có dữ liệu* · *không đọc được*. Trạng thái thứ ba **không được** dẫn tới ghi.

### 4.3 Backup phải là artifact user giữ được, và phải verify
Backup trước migration **không được** chỉ là một key khác trong IndexedDB — vì IndexedDB chính là chỗ có thể bay. Phải là **file tải về được**, và phải **mở lại + đếm row** trước khi chạy bất kỳ bước phá huỷ nào.

### 4.4 Ghi v2 vào key IndexedDB MỚI
Chạy `isSchemaValid()` **hiện tại** trên file v2 trả `false` → gọi `clearIndexedDB()`. Nghĩa là một service-worker shell cũ còn cache có thể chạy code cũ và **xoá cây đã migrate**.

Đã thử shim bằng generated column — **không được**: generated column **vô hình với `pragma_table_info`** (kiểm chứng cả `VIRTUAL` và `STORED`).

→ v2 ghi vào **key mới**, để nguyên blob v1 ở chỗ code cũ mong đợi. Đó là cách làm việc xoá dữ liệu **bất khả thi về cấu trúc**, không chỉ là "tránh".

### 4.5 Transaction, và một giới hạn phải biết
Bọc mọi thao tác nhiều câu lệnh trong `BEGIN`/`COMMIT`. **ĐÃ LÀM** — `withTransaction()` trong `src/db/persons.ts` (Phase 1A, nguồn: `plans/reports/fullstack-260822-0157-phase1a-durability.md`).

**Nhưng phải hiểu giới hạn, kể cả sau khi có transaction**: mỗi lần ghi hiện là `db.export()` **toàn bộ file** rồi `put` một blob. Nên **bảo đảm nguyên tử của SQLite dừng ở biên persist** — artifact được lưu có đúng đặc tính "ghi lại toàn bộ hoặc không" như một file JSON. Transaction bảo vệ tính nhất quán *trong* DB; nó **không** bảo vệ việc blob ghi ra ngoài bị hỏng giữa đường.

→ Đây là lý do độc lập để có snapshot có version (§5), không chỉ vì tiện.

## 5. Đồng bộ Google Drive

### 5.1 Không có background sync — về nguyên lý
`.plan/plan.md` cũ ghi "background job / debounce 5-10s rồi silent upload". **Không khả thi**: client browser-only public OAuth **không giữ được refresh token**. Sync phải là **user bấm**, hoặc re-auth mỗi session.

### 5.2 Never-overwrite, không dùng precondition
**Không xác nhận được** Google Drive `files.update` hỗ trợ `If-Match`. Nên **không** thiết kế theo optimistic concurrency bằng precondition.

Thay vào đó: **không ghi đè tại chỗ.** Ghi ra file/revision mới, giữ N bản gần nhất. Xung đột thì tạo **bản copy bất biến**, không merge tự động.

Rủi ro codex nêu thêm: **trùng tên file trên Drive** có thể tạo hai nhánh dữ liệu song song — phải định danh bằng id, không bằng tên.

### 5.3 Hai thiết bị, không cần UI merge
Theo D27: desktop nhập hàng loạt, điện thoại tra cứu và sửa nhỏ. Vậy cần **phát hiện** xung đột nhưng **không cần** giải quyết xung đột từng field: **bản mới thắng, bản cũ giữ thành version**. Người dùng là một người nên không có tranh chấp thẩm quyền.

### 5.4 OAuth trong browser
Không backend nghĩa là **PKCE, không client secret**. Token nằm trong bộ nhớ trang → phơi ra XSS. Đây là lý do thêm để không có `dangerouslySetInnerHTML` và để sanitize mọi URL do user nhập (Facebook, Google Maps, avatar) — xem [privacy.md](privacy.md).

## 6. Thứ tự làm

> Nguồn trạng thái bước 1–3: `plans/reports/fullstack-260822-0157-phase1a-durability.md`.

1. **Export/import file lossless** — XONG (`src/db/backup.ts`).
2. `user_version` + migration thật, backup verify được — XONG (`src/db/schema.ts`). Migration đi theo hướng **cộng thêm tại chỗ** (bù cột thiếu bằng `ALTER TABLE`, ràng buộc bằng trigger thêm được vào bảng cũ) chứ không theo đúng nghĩa đen "ghi vào key IndexedDB mới" đã tính ở §4.4 — vì lý do khiến §4.4 cần key mới (một service-worker shell cũ chạy code cũ gọi `clearIndexedDB()`) chưa áp dụng được: chưa có service worker nào từng chạy. §4.4 vẫn còn hiệu lực làm luật thiết kế **khi** bước 4 (PWA/service worker) triển khai.
3. Sửa hai đường mất dữ liệu ở §1, sửa thứ tự ghi ở §3, gộp 3 lần save/click — XONG.
4. `navigator.storage.persist()` — XONG (`requestPersistentStorage()`). manifest + icon + service worker → **CHƯA LÀM**; chưa thực sự là PWA installable.
5. Drive sync: user-initiated, never-overwrite, snapshot có version — **CHƯA LÀM**.

Bước 1–3 là điều kiện để **bắt đầu nhập dữ liệu thật** (xem D28) — đã xong.

## 7. Không phải vấn đề — đã kết luận, không xét lại

- `escapeSql` quoting **giá trị** không khai thác được. Lỗi thật là **nội suy TÊN CỘT** không escape trong `updatePerson` → dùng allowlist cột hoặc parameterised builder.
- Rủi ro "upload bị truncate" bị đánh giá quá cao trong bản review đầu, đã hạ.
- Không có secret nào bị commit. `.agent/mcp_config.json` chỉ chứa placeholder, đã untracked + gitignored.
