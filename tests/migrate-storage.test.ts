/**
 * Bốn cổng an toàn của migration ở tầng lưu trữ.
 *
 * Đây là chỗ dữ liệu thật có thể mất, nên test ở đây kiểm ĐIỀU KIỆN ĐƯỢC PHÉP GHI,
 * không kiểm nội dung biến đổi (nội dung đã có `tests/migrate-v2.test.ts`).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createEmptyDb, openBytes } from "./helpers/create-test-db.ts";
import {
  V1_DATA_KEY,
  V2_DATA_KEY,
  chooseStorageKey,
  migrateBytesToV2,
  verifyBackupBytes,
  BackupNotVerifiedError,
} from "../src/db/migrate-storage.ts";
import { getUserVersion, isV2Schema } from "../src/db/schema-v2.ts";

async function legacyBytes() {
  const db = await createEmptyDb();
  db.run(`
    CREATE TABLE persons (id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT,
                          gender TEXT, is_living INTEGER, is_anchor INTEGER);
    CREATE TABLE relationships (id TEXT PRIMARY KEY, person_id TEXT, related_to_id TEXT,
                                rel_type TEXT, is_primary INTEGER);
    INSERT INTO persons VALUES ('a','Giáp','Nguyễn','MALE',0,1),('b','Cả','Trần','FEMALE',1,0);
    INSERT INTO relationships VALUES ('r1','a','b','SPOUSE',1);
  `);
  const bytes = db.export();
  db.close();
  return bytes;
}

test("KEY v2 khác KEY v1 — đây là thứ làm việc xoá bất khả thi về cấu trúc", () => {
  assert.notEqual(V1_DATA_KEY, V2_DATA_KEY);
  assert.equal(V1_DATA_KEY, "main", "code cũ đọc đúng key này, phải giữ nguyên tên");
});

test("chọn key: v2 thắng; chỉ có v1 thì MỜI migrate chứ không tự chạy", () => {
  assert.deepEqual(chooseStorageKey({ hasV1: true, hasV2: true }),
    { action: "open-v2", key: V2_DATA_KEY });
  assert.deepEqual(chooseStorageKey({ hasV1: true, hasV2: false }),
    { action: "open-v1-offer-migration", key: V1_DATA_KEY },
    "tự migrate sẽ bỏ qua cổng P1 (người dùng phải nhận file backup)");
  assert.deepEqual(chooseStorageKey({ hasV1: false, hasV2: false }),
    { action: "fresh-v2", key: V2_DATA_KEY });
});

test("chưa verify backup ⇒ TỪ CHỐI migrate", async () => {
  const bytes = await legacyBytes();
  assert.throws(
    () => migrateBytesToV2(bytes, openBytes, false),
    BackupNotVerifiedError,
    "cổng P1/P2 chỉ bỏ qua được bằng một hành động cố ý, nhìn thấy được ở chỗ gọi",
  );
});

test("verify backup: khớp row thì qua, lệch row thì chặn", async () => {
  const bytes = await legacyBytes();
  const source = await createEmptyDb(bytes);

  const ok = verifyBackupBytes(source, bytes, openBytes);
  assert.deepEqual(ok, { persons: 2, relationships: 1 });

  // Backup "khác" — thiếu một người.
  const tampered = await createEmptyDb(bytes);
  tampered.run("DELETE FROM persons WHERE id='b'");
  const tamperedBytes = tampered.export();
  tampered.close();

  assert.throws(
    () => verifyBackupBytes(source, tamperedBytes, openBytes),
    /Backup không khớp bản gốc/,
  );
  source.close();
});

test("backup rỗng hoặc không mở được ⇒ chặn, không migrate", async () => {
  const bytes = await legacyBytes();
  const source = await createEmptyDb(bytes);
  assert.throws(() => verifyBackupBytes(source, new Uint8Array(0), openBytes), BackupNotVerifiedError);
  assert.throws(
    () => verifyBackupBytes(source, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), openBytes),
    BackupNotVerifiedError,
  );
  source.close();
});

test("migrate thành công: bytes v2 hợp lệ, và BYTES V1 GỐC không đổi một byte nào", async () => {
  const bytes = await legacyBytes();
  const snapshot = Uint8Array.from(bytes);

  const { report, bytes: v2Bytes } = migrateBytesToV2(bytes, openBytes, true);

  assert.deepEqual(bytes, snapshot, "bản gốc trong bộ nhớ không bị sửa tại chỗ");
  assert.equal(report.counts.personsAfter, 2);

  const migrated = await createEmptyDb(v2Bytes);
  assert.ok(isV2Schema(migrated));
  assert.equal(getUserVersion(migrated), 2);
  assert.equal(Number(migrated.exec("SELECT count(*) FROM persons")[0].values[0][0]), 2);
  migrated.close();

  // Và bytes v1 vẫn mở được như v1 — đây là thứ nằm lại ở key "main".
  const stillV1 = await createEmptyDb(snapshot);
  assert.equal(getUserVersion(stillV1), 0);
  assert.equal(
    Number(stillV1.exec("SELECT count(*) FROM relationships")[0].values[0][0]), 1,
    "blob v1 còn nguyên để code cũ đọc",
  );
  stillV1.close();
});
