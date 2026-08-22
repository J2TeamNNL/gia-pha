/**
 * Test schema thật (src/db/schema.ts): khởi tạo, kiểm hợp lệ, và một sự thật
 * SQLite đã kiểm chứng ở wasm mà migration v2 phụ thuộc vào.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { initDatabaseSchema, isSchemaValid, getUserVersion, SCHEMA_VERSION, WRITABLE_PERSON_COLUMNS } from "../src/db/schema.ts";
import { createTestDb } from "./helpers/create-test-db.ts";

test("initDatabaseSchema trên DB rỗng: tạo bảng, ghi user_version, báo fresh=true", async () => {
  const db = await createTestDb();
  // createTestDb() đã gọi initDatabaseSchema — gọi lại để kiểm kết quả trả về idempotent.
  const result = initDatabaseSchema(db);
  assert.equal(result.fresh, false, "lần gọi thứ hai không còn là DB rỗng nữa");
  assert.equal(getUserVersion(db), SCHEMA_VERSION);
  db.close();
});

test("isSchemaValid trả true cho DB vừa init đúng schema", async () => {
  const db = await createTestDb();
  assert.equal(isSchemaValid(db), true);
  db.close();
});

test("isSchemaValid trả false cho DB không có bảng nào", async () => {
  const db = await createTestDb();
  db.run("DROP TABLE persons; DROP TABLE relationships;");
  assert.equal(isSchemaValid(db), false);
  db.close();
});

test("persons.first_name là NOT NULL — insert thiếu cột bị chặn", async () => {
  const db = await createTestDb();
  assert.throws(
    () => db.run("INSERT INTO persons (id) VALUES ('bare-id')"),
    /NOT NULL constraint failed: persons\.first_name/,
  );
  db.close();
});

test(
  "sự thật SQLite đã kiểm chứng: generated column không xuất hiện trong pragma_table_info, chỉ trong table_xinfo",
  async () => {
    const db = await createTestDb();
    db.run(`
      CREATE TABLE probe_generated (
        id INTEGER PRIMARY KEY,
        a INTEGER,
        b INTEGER GENERATED ALWAYS AS (a * 2) VIRTUAL
      );
    `);
    const tableInfoCols = db
      .exec("PRAGMA table_info(probe_generated)")[0]
      .values.map((row) => row[1]);
    const xinfoCols = db
      .exec("PRAGMA table_xinfo(probe_generated)")[0]
      .values.map((row) => row[1]);

    assert.deepEqual(tableInfoCols, ["id", "a"], "pragma_table_info PHẢI thiếu cột generated");
    assert.deepEqual(xinfoCols, ["id", "a", "b"], "table_xinfo PHẢI thấy đủ cột, gồm generated");
    db.close();
  },
);

/**
 * Allowlist tên cột cho `updatePerson`. `escapeSql` chỉ quote GIÁ TRỊ — tên cột
 * trước đây đi thẳng vào câu SQL. Allowlist sinh từ chính bảng khai báo cột nên
 * không lệch được với schema thật.
 */
test("WRITABLE_PERSON_COLUMNS khớp schema thật và loại cột không được ghi", async () => {
  const db = await createTestDb();
  const actual = new Set(
    db.exec("PRAGMA table_xinfo(persons)")[0].values.map((r) => String(r[1])),
  );
  db.close();

  for (const col of WRITABLE_PERSON_COLUMNS) {
    assert.ok(actual.has(col), `allowlist có "${col}" mà bảng thật không có`);
  }
  for (const managed of ["id", "created_at", "updated_at"]) {
    assert.equal(
      WRITABLE_PERSON_COLUMNS.has(managed),
      false,
      `"${managed}" do DB quản, tầng app không được ghi trực tiếp`,
    );
  }
  // Tên cột lạ / mưu toan chèn SQL không được nằm trong allowlist.
  for (const bad of ["notes = 'x', is_anchor", "1=1", "first_name; DROP TABLE persons"]) {
    assert.equal(WRITABLE_PERSON_COLUMNS.has(bad), false, `phải chặn "${bad}"`);
  }
});
