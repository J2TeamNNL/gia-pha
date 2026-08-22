/**
 * Ràng buộc toàn vẹn của relationships (docs/architecture.md §3, §6):
 * FK bật, orphan edge, tự làm cha mình, chu trình A→B→A.
 *
 * Cả 4 PASS thật hôm nay (2026-08-22) qua initDatabaseSchema thật từ
 * src/db/schema.ts — không cần { todo: true }. Orphan / tự-làm-cha-mình /
 * chu trình chặn bằng TRIGGER được tạo trong initDatabaseSchema, độc lập
 * `PRAGMA foreign_keys` (trigger áp được cả cho DB cũ đã tồn tại bảng
 * relationships không có FOREIGN KEY clause, xem comment ở
 * `constraintTriggers()` trong schema.ts). `enableForeignKeys()` là lớp bảo
 * vệ thứ hai (FOREIGN KEY constraint thật) — test riêng, không phải điều
 * kiện để 3 trigger trên hoạt động.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { enableForeignKeys } from "../src/db/schema.ts";
import { createTestDb } from "./helpers/create-test-db.ts";

test("enableForeignKeys(): PRAGMA foreign_keys trả về 1", async () => {
  const db = await createTestDb();
  enableForeignKeys(db);
  const value = db.exec("PRAGMA foreign_keys")[0].values[0][0];
  assert.equal(value, 1);
  db.close();
});

test("orphan edge (related_to_id không tồn tại) bị chặn bởi trigger — không cần enableForeignKeys()", async () => {
  const db = await createTestDb();
  // Cố ý KHÔNG gọi enableForeignKeys(db): trigger phải tự chặn được, vì nó
  // còn phải bảo vệ DB cũ không có FOREIGN KEY clause trong DDL relationships.
  db.run("INSERT INTO persons (id, first_name) VALUES ('p1', 'A')");
  assert.throws(
    () =>
      db.run(
        "INSERT INTO relationships (id, person_id, related_to_id, rel_type) VALUES ('r1','p1','ghost','PARENT_OF')",
      ),
    /quan hệ trỏ tới người không tồn tại/,
  );
  db.close();
});

test("tự làm cha mình (person_id = related_to_id, PARENT_OF) bị chặn", async () => {
  const db = await createTestDb();
  db.run("INSERT INTO persons (id, first_name) VALUES ('p1', 'A')");
  assert.throws(
    () =>
      db.run(
        "INSERT INTO relationships (id, person_id, related_to_id, rel_type) VALUES ('r1','p1','p1','PARENT_OF')",
      ),
    /một người không thể có quan hệ với chính mình/,
  );
  db.close();
});

test("chu trình A→B→A (PARENT_OF cả hai chiều) bị chặn", async () => {
  const db = await createTestDb();
  db.run("INSERT INTO persons (id, first_name) VALUES ('a', 'A'), ('b', 'B')");
  db.run(
    "INSERT INTO relationships (id, person_id, related_to_id, rel_type) VALUES ('r-ab','a','b','PARENT_OF')",
  );
  assert.throws(
    () =>
      db.run(
        "INSERT INTO relationships (id, person_id, related_to_id, rel_type) VALUES ('r-ba','b','a','PARENT_OF')",
      ),
    /quan hệ cha-con tạo thành chu trình/,
  );
  db.close();
});

test("xoá người còn quan hệ bị chặn — phải xoá quan hệ trước (trg_person_delete_guard)", async () => {
  const db = await createTestDb();
  db.run("INSERT INTO persons (id, first_name) VALUES ('a', 'A'), ('b', 'B')");
  db.run(
    "INSERT INTO relationships (id, person_id, related_to_id, rel_type) VALUES ('r-ab','a','b','PARENT_OF')",
  );
  assert.throws(
    () => db.run("DELETE FROM persons WHERE id = 'a'"),
    /phải xoá các quan hệ của người này trước/,
  );
  db.close();
});

/**
 * Ngữ nghĩa transaction mà `createPersonWithRelationships` dựa vào: người mới +
 * mọi cạnh của họ trong MỘT transaction. Nếu ràng buộc chặn một cạnh, người vừa
 * chèn cũng phải biến mất — nếu không, giao diện báo lỗi mà DB vẫn còn người mồ côi.
 */
test("transaction: cạnh bị ràng buộc chặn thì người vừa chèn cũng rollback", async () => {
  const db = await createTestDb();
  enableForeignKeys(db);
  db.run("INSERT INTO persons (id, first_name) VALUES ('cha', 'Cha')");

  assert.throws(() => {
    db.run("BEGIN");
    try {
      db.run("INSERT INTO persons (id, first_name) VALUES ('moi', 'Mới')");
      // Cạnh trỏ tới người không tồn tại — trigger chặn.
      db.run(
        "INSERT INTO relationships (id, person_id, related_to_id, rel_type) VALUES ('r','moi','KHONG-CO','PARENT_OF')",
      );
      db.run("COMMIT");
    } catch (err) {
      db.run("ROLLBACK");
      throw err;
    }
  });

  assert.equal(
    Number(db.exec("SELECT count(*) FROM persons")[0].values[0][0]),
    1,
    "chỉ còn 'cha' — 'moi' đã bị rollback, không để lại người mồ côi",
  );
  db.close();
});
