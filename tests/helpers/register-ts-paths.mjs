/**
 * Resolver hook cho harness test.
 *
 * Vì sao cần: mã trong `src/` viết theo quy ước của Next — import **không có
 * đuôi** (`./schema`) và alias **`@/`** (`@/db/types`). Trình nạp ESM của Node
 * không hiểu cả hai. Không có hook này thì chỉ những module `src/` nào tình cờ
 * không có import tương đối nào mới test được — tức là đúng những module ít cần
 * test nhất.
 *
 * Hook chỉ ánh xạ đường dẫn. Nó KHÔNG biến đổi mã, nên thứ chạy trong test là
 * đúng file mà Next sẽ build.
 *
 * Dùng: `node --import ./tests/helpers/register-ts-paths.mjs --test "tests/*.test.ts"`
 */
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolvePath(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Thứ tự thử, giống cách bundler phân giải một specifier không đuôi. */
const CANDIDATE_SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx"];

function firstExisting(basePath) {
  if (existsSync(basePath) && !basePath.endsWith("/")) return basePath;
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = basePath + suffix;
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    // Alias `@/x` → `<root>/src/x`, đúng như `tsconfig.json` khai báo.
    if (specifier.startsWith("@/")) {
      const found = firstExisting(resolvePath(projectRoot, "src", specifier.slice(2)));
      if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
    }

    // Import tương đối không đuôi, chỉ khi bên gọi là một file TypeScript.
    if (specifier.startsWith(".") && context.parentURL?.match(/\.tsx?$/)) {
      const parentDir = dirname(fileURLToPath(context.parentURL));
      const found = firstExisting(resolvePath(parentDir, specifier));
      if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
    }

    return nextResolve(specifier, context);
  },
});
