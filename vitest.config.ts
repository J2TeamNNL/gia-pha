import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // references/ holds competitor repositories cloned for study. They are
    // gitignored, so CI never sees them and stays green while a developer who
    // has them collects their test suites and failures instead.
    exclude: ["e2e/**", "node_modules/**", "references/**", "dist/**"],
  },
});
