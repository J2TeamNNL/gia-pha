/**
 * Migration DB v0.x → v1 (`docs/sync-durability.md` §1, §4.1).
 *
 * Đây là đoạn code duy nhất có thể phá dữ liệu thật, nên test ở đây kiểm
 * ĐÚNG MỘT điều trên hết: **không row nào được mất**. Mọi trường hợp dưới đây
 * mô phỏng một DB đang nằm trên máy người dùng thật:
 *  - tạo bởi bản app cũ, thiếu 20 cột
 *  - có sẵn row xấu (orphan edge, tự trỏ vào mình) do bản cũ không có ràng buộc
 *  - hoặc do bản app MỚI HƠN ghi ra
 *
 * Đóng gói lại từ script kiểm chứng của phiên 2026-08-22 (Phase 1A) để chạy lại được.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initDatabaseSchema,
  isSchemaValid,
  getUserVersion,
  enableForeignKeys,
  SchemaTooNewError,
} from "../src/db/schema.ts";
import { createEmptyDb } from "./helpers/create-test-db.ts";

/** DB đúng hình dạng bản v0.x: persons chỉ 5 cột, relationships KHÔNG có FOREIGN KEY. */
async function createLegacyV0Db() {
  const db = await createEmptyDb();
  db.run(`
    CREATE TABLE persons (id TEXT PRIMARY KEY, first_name TEXT NOT NULL, gender TEXT,
                          is_living INTEGER, is_anchor INTEGER);
    CREATE TABLE relationships (id TEXT PRIMARY KEY, person_id TEXT, related_to_id TEXT,
                                rel_type TEXT, is_primary INTEGER);
    INSERT INTO persons VALUES ('p1','Bình','MALE',0,1),
                              ('p2','Hùng','MALE',1,0),
                              ('p3','An','MALE',1,0);
    INSERT INTO relationships VALUES ('r1','p1','p2','PARENT_OF',1);
    INSERT INTO relationships VALUES ('r2','p2','p3','PARENT_OF',1);
    INSERT INTO relationships VALUES ('rBad','p1','GHOST','PARENT_OF',1);
    INSERT INTO relationships VALUES ('rSelf','p3','p3','SPOUSE',0);
  `);
  return db;
}

const count = (db: import("sql.js").Database, sql: string) =>
  Number(db.exec(sql)[0].values[0][0]);

test("DB v0.x: migration bù đủ cột thiếu và KHÔNG mất người nào", async () => {
  const db = await createLegacyV0Db();
  assert.equal(getUserVersion(db), 0, "DB cũ không có user_version");
  assert.equal(isSchemaValid(db), false, "DB cũ thiếu cột");

  enableForeignKeys(db);
  const result = initDatabaseSchema(db);

  assert.equal(result.fromVersion, 0);
  assert.equal(result.addedColumns.length, 20, "bù đúng 20 cột bằng ALTER TABLE");
  assert.equal(count(db, "SELECT count(*) FROM persons"), 3, "không mất người nào");
  assert.equal(
    db.exec("SELECT first_name FROM persons WHERE id='p1'")[0].values[0][0],
    "Bình",
    "chữ tiếng Việt nguyên vẹn qua ALTER TABLE",
  );
  assert.equal(getUserVersion(db), 1);
  assert.equal(isSchemaValid(db), true);
  db.close();
});

test("DB v0.x: row xấu bị CÁCH LY, không bị xoá", async () => {
  const db = await createLegacyV0Db();
  enableForeignKeys(db);
  const result = initDatabaseSchema(db);

  assert.equal(result.quarantinedRows, 2, "1 orphan edge + 1 tự trỏ vào mình");
  assert.equal(count(db, "SELECT count(*) FROM relationships"), 2, "còn 2 quan hệ hợp lệ");
  assert.equal(
    count(db, "SELECT count(*) FROM relationships_quarantine"),
    2,
    "2 row xấu nằm nguyên trong bảng cách ly — đây là điểm khác 'DELETE'",
  );
  assert.deepEqual(
    db
      .exec("SELECT reason FROM relationships_quarantine ORDER BY reason")[0]
      .values.flat(),
    ["orphan-edge", "self-relationship"],
    "ghi đúng lý do để về sau tra lại được",
  );
  db.close();
});

test("migration chạy lại lần hai là no-op", async () => {
  const db = await createLegacyV0Db();
  enableForeignKeys(db);
  initDatabaseSchema(db);
  const again = initDatabaseSchema(db);

  assert.equal(again.fromVersion, 1);
  assert.equal(again.addedColumns.length, 0);
  assert.equal(again.quarantinedRows, 0);
  db.close();
});

test("sau migration, ràng buộc áp được cả trên bảng cũ không có FOREIGN KEY", async () => {
  const db = await createLegacyV0Db();
  enableForeignKeys(db);
  initDatabaseSchema(db);

  // Chu trình SÂU: p1→p2→p3 đã tồn tại, thêm p3→p1 là chu trình 3 bậc.
  assert.throws(
    () =>
      db.run(
        "INSERT INTO relationships (id, person_id, related_to_id, rel_type) VALUES ('x','p3','p1','PARENT_OF')",
      ),
    /chu trình/,
    "chu trình sâu hơn A→B→A cũng phải bị chặn",
  );
  // Chu trình tạo qua UPDATE, không chỉ INSERT. Đổi r2 (p2→p3) thành p3→p1:
  // tổ tiên của p3 lúc này gồm p1, nên cạnh mới đóng vòng.
  assert.throws(
    () =>
      db.run("UPDATE relationships SET person_id='p3', related_to_id='p1' WHERE id='r2'"),
    /chu trình/,
  );
  // Và tự trỏ vào mình qua UPDATE cũng bị chặn (nguyên nhân khác, thông báo khác).
  assert.throws(
    () => db.run("UPDATE relationships SET related_to_id='p1' WHERE id='r1'"),
    /quan hệ với chính mình/,
  );
  // SPOUSE hai chiều KHÔNG phải chu trình — phải cho qua.
  db.run(
    "INSERT INTO relationships (id, person_id, related_to_id, rel_type) VALUES ('s1','p1','p3','SPOUSE')",
  );
  assert.equal(count(db, "SELECT count(*) FROM relationships"), 3);
  db.close();
});

test("file do bản app MỚI HƠN ghi ra: từ chối mở, không sửa gì", async () => {
  const db = await createEmptyDb();
  db.run("PRAGMA user_version = 99");

  assert.throws(() => initDatabaseSchema(db), SchemaTooNewError);
  assert.equal(getUserVersion(db), 99, "không dập version của file lạ");
  assert.equal(
    count(db, "SELECT count(*) FROM sqlite_master WHERE type='table'"),
    0,
    "không tạo bảng nào trên một file chưa hiểu được",
  );
  db.close();
});

test("export/import lossless: user_version, trigger và bảng cách ly đều sống", async () => {
  const source = await createLegacyV0Db();
  enableForeignKeys(source);
  initDatabaseSchema(source);
  const bytes = source.export();
  const triggers = count(
    source,
    "SELECT count(*) FROM sqlite_master WHERE type='trigger'",
  );
  source.close();

  const reopened = await createEmptyDb(bytes);
  assert.equal(getUserVersion(reopened), 1);
  assert.equal(count(reopened, "SELECT count(*) FROM persons"), 3);
  assert.equal(count(reopened, "SELECT count(*) FROM relationships_quarantine"), 2);
  assert.equal(
    count(reopened, "SELECT count(*) FROM sqlite_master WHERE type='trigger'"),
    triggers,
  );
  assert.equal(
    count(reopened, "PRAGMA foreign_keys"),
    0,
    "PRAGMA foreign_keys KHÔNG nằm trong file — connection mới phải bật lại, đây là lý do enableForeignKeys() gọi mỗi lần mở",
  );
  reopened.close();
});
