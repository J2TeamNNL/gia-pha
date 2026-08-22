/**
 * Helper harness: nạp sql.js (wasm thật ở public/sql-wasm.wasm, bản 3.49.1 —
 * KHÁC bản host sqlite3 CLI 3.51.0, xem docs/architecture.md §6) trong Node,
 * và tạo DB in-memory mới đã áp schema thật từ src/db/schema.ts.
 *
 * Mỗi test PHẢI gọi createTestDb() riêng để có DB sạch — không share state.
 * Module wasm (biên dịch) được cache 1 lần cho cả tiến trình test vì compile
 * lại wasm mỗi test rất chậm; chỉ Database instance là mới mỗi lần.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";
import type { Database, SqlJsStatic } from "sql.js";
import { initDatabaseSchema } from "../../src/db/schema.ts";
import type { Person, Relationship } from "../../src/db/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WASM_PATH = join(__dirname, "..", "..", "public", "sql-wasm.wasm");

let sqlModulePromise: Promise<SqlJsStatic> | null = null;
/** Module wasm đã nạp — cần cho `openBytes()` đồng bộ. */
let loadedSql: SqlJsStatic | null = null;

function getSqlModule(): Promise<SqlJsStatic> {
  if (!sqlModulePromise) {
    const wasmBinary = readFileSync(WASM_PATH);
    sqlModulePromise = initSqlJs({ wasmBinary }).then((sql) => {
      loadedSql = sql;
      return sql;
    });
  }
  return sqlModulePromise;
}

/**
 * Mở bytes thành `Database` **đồng bộ**. Dùng cho các hàm nhận `openDatabase`
 * dạng tiêm phụ thuộc (xem `src/db/migrate-storage.ts`). Chỉ gọi được sau khi
 * module wasm đã nạp — tức sau ít nhất một lần `createEmptyDb()`.
 */
export function openBytes(bytes: Uint8Array): Database {
  if (!loadedSql) throw new Error("Gọi createEmptyDb() trước để nạp module wasm.");
  return new loadedSql.Database(bytes);
}

/**
 * DB in-memory THÔ — chưa áp schema. Dùng để dựng DB hình dạng bản cũ rồi kiểm
 * migration, hoặc để mở lại một file đã export (`bytes`).
 */
export async function createEmptyDb(bytes?: Uint8Array): Promise<Database> {
  const SQL = await getSqlModule();
  return bytes ? new SQL.Database(bytes) : new SQL.Database();
}

/**
 * Tạo DB SQLite in-memory mới, đã chạy `initDatabaseSchema` thật (bảng +
 * migration cột + trigger chống tự-làm-cha-mình / chống chu trình + index).
 * KHÔNG tự bật `PRAGMA foreign_keys` — pragma này reset mỗi connection, gọi
 * `enableForeignKeys(db)` (export từ src/db/schema.ts) riêng khi cần.
 */
export async function createTestDb(): Promise<Database> {
  const SQL = await getSqlModule();
  const db = new SQL.Database();
  initDatabaseSchema(db);
  return db;
}

function toSqlValue(value: unknown): string | number | Uint8Array | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  return value as string | number;
}

/**
 * Ghi fixture (persons + relationships) vào một DB đã có schema. Dùng
 * parameter binding — KHÔNG nội suy chuỗi (khác cách `escapeSql` trong
 * src/db/persons.ts) — để tránh nhiễu kết quả test bằng lỗi escaping.
 */
export function insertFixture(
  db: Database,
  fixture: { persons: Person[]; relationships: Relationship[] },
): void {
  for (const person of fixture.persons) {
    const columns = Object.keys(person);
    const placeholders = columns.map(() => "?").join(", ");
    const values = columns.map((c) => toSqlValue((person as Record<string, unknown>)[c]));
    db.run(`INSERT INTO persons (${columns.join(", ")}) VALUES (${placeholders})`, values);
  }
  for (const rel of fixture.relationships) {
    db.run(
      "INSERT INTO relationships (id, person_id, related_to_id, rel_type, is_primary) VALUES (?, ?, ?, ?, ?)",
      [rel.id, rel.person_id, rel.related_to_id, rel.rel_type, rel.is_primary ? 1 : 0],
    );
  }
}
