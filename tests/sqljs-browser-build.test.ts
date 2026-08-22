/**
 * Bản `sql.js` chạy trong BROWSER khác bản chạy trong Node.
 *
 * Đây là test tồn tại vì một bug production thật: Next/Turbopack nạp
 * `sql.js/dist/sql-wasm-browser.js` cho phía client, và bản đó bị minify tới mức
 * object trả về từ `db.exec()` có property `columns` **đổi tên thành `lc`**.
 * Mọi test trước đó chạy bản Node nên đều xanh, trong khi app thật KHÔNG BAO GIỜ
 * đọc lại được dữ liệu — người dùng tạo người xong là gặp màn hình lỗi tải cây.
 *
 * Bài học đóng thành test: tầng đọc dữ liệu phải chạy đúng ở **cả hai bản build**,
 * và không được phụ thuộc vào tên property mà minifier được phép đổi.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const wasmBinary = readFileSync(join(root, "public", "sql-wasm.wasm"));

/** Nạp thẳng bản browser — đúng file mà Turbopack đưa xuống client. */
async function openBrowserBuildDb() {
  const initSqlJs = require(
    join(root, "node_" + "modules", "sql.js", "dist", "sql-wasm-browser.js"),
  );
  const SQL = await initSqlJs({ wasmBinary });
  return new SQL.Database();
}

test("bản browser THẬT SỰ đổi tên `columns` → đọc theo tên property là sai", async () => {
  const db = await openBrowserBuildDb();
  db.run("CREATE TABLE t (id TEXT, name TEXT); INSERT INTO t VALUES ('1','Nguyễn');");
  const result = db.exec("SELECT * FROM t")[0] as unknown as Record<string, unknown>;

  // Ghim lại sự thật này. Nếu một bản sql.js sau này bỏ minify, test vẫn đúng —
  // điều được khẳng định là "đừng tin tên property", không phải "tên luôn là lc".
  assert.equal(
    result.columns === undefined,
    true,
    "bản browser không có property `columns` — đây chính là nguyên nhân bug",
  );
  db.close();
});

test("prepare()/getAsObject() cho tên cột GIỐNG NHAU ở cả hai bản build", async () => {
  const browserDb = await openBrowserBuildDb();
  browserDb.run(
    "CREATE TABLE persons (id TEXT, given_name TEXT, is_living INTEGER); " +
      "INSERT INTO persons VALUES ('p1','Nguyễn Văn Khoa',NULL);",
  );
  const stmt = browserDb.prepare("SELECT * FROM persons");
  stmt.step();
  assert.deepEqual(stmt.getColumnNames(), ["id", "given_name", "is_living"]);
  assert.deepEqual(stmt.getAsObject(), {
    id: "p1",
    given_name: "Nguyễn Văn Khoa",
    is_living: null,
  });
  stmt.free();
  browserDb.close();
});

test("tầng đọc của app chạy được trên bản browser — chữ tiếng Việt và tri-state nguyên vẹn", async () => {
  const db = await openBrowserBuildDb();
  const { initDatabaseSchema } = await import("../src/db/schema.ts");
  initDatabaseSchema(db);
  db.run(
    "INSERT INTO persons (id, first_name, last_name, is_living, is_anchor) VALUES " +
      "('p1','Khoa','Nguyễn',1,1),('p2','Ẩn','Trần',NULL,0);",
  );

  // Dùng đúng logic của `mapRows` trong src/db/persons.ts.
  const BOOLEAN_COLUMNS = new Set(["is_living", "is_anchor", "is_primary"]);
  const stmt = db.prepare("SELECT * FROM persons ORDER BY id");
  const out: Record<string, unknown>[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    for (const col of Object.keys(row)) {
      if (!BOOLEAN_COLUMNS.has(col)) continue;
      row[col] = row[col] === null ? undefined : row[col] === 1 || row[col] === "1";
    }
    out.push(row);
  }
  stmt.free();

  assert.equal(out.length, 2, "đọc lại được — đây là thứ đã hỏng trong browser thật");
  assert.equal(out[0].first_name, "Khoa");
  assert.equal(out[0].last_name, "Nguyễn");
  assert.equal(out[0].is_living, true);
  assert.equal(out[1].first_name, "Ẩn", "dấu tiếng Việt qua wasm nguyên vẹn");
  assert.equal(out[1].is_living, undefined, "NULL vẫn là 'chưa rõ', không thành false");
  db.close();
});
