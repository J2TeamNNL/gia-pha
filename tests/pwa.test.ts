/**
 * Guard cho service worker. `public/sw.js` cache `sql-wasm.wasm` theo kiểu
 * cache-first dưới một cache key có version đặt TAY. Nếu ai nâng `sql.js` mà
 * quên bump key đó, người dùng sẽ nhận **wasm cũ cho code mới** — im lặng, và
 * chỉ lộ ra khi DB hành xử lạ.
 *
 * Test này biến việc "phải nhớ bump" thành việc máy kiểm.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

test("sw.js khai báo đúng phiên bản sql.js đang dùng trong package.json", () => {
  const pkg = JSON.parse(read("package.json")) as {
    dependencies: Record<string, string>;
  };
  const declared = pkg.dependencies["sql.js"].replace(/^[^\d]*/, "");
  const sw = read("public/sw.js");

  const match = sw.match(/const SQLJS_VERSION = "([^"]+)"/);
  assert.ok(match, "public/sw.js phải khai báo SQLJS_VERSION");
  assert.equal(
    match[1],
    declared,
    "sql.js đã đổi phiên bản — bump CACHE_VERSION trong public/sw.js rồi cập nhật SQLJS_VERSION",
  );
});

test("sw.js không bao giờ cache-first cho document hoặc JS", () => {
  const sw = read("public/sw.js");
  const cacheFirstList = sw.match(/CACHE_FIRST_PATHS = \[([^\]]*)\]/s);
  assert.ok(cacheFirstList, "phải có allowlist CACHE_FIRST_PATHS tường minh");

  for (const bad of [".js", ".css", '"/"', "index.html"]) {
    assert.equal(
      cacheFirstList[1].includes(bad),
      false,
      `${bad} không được nằm trong danh sách cache-first — shell cũ chạy code cũ là đường mất dữ liệu (docs/sync-durability.md §4.4)`,
    );
  }
});

/** Bỏ comment để chỉ soi CODE — header của sw.js có nhắc "IndexedDB" khi giải thích. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

test("sw.js không chạm IndexedDB (soi code, không soi comment)", () => {
  const code = stripComments(read("public/sw.js"));
  for (const forbidden of ["indexedDB", "gia-pha-db", "deleteDatabase"]) {
    assert.equal(
      code.includes(forbidden),
      false,
      `code service worker không được dùng "${forbidden}" — dữ liệu gia phả nằm ngoài phạm vi SW (docs/sync-durability.md §4.4)`,
    );
  }
});
