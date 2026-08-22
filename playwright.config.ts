import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke suite — lưới an toàn cho refactor data model v2 (xem
 * `plans/reports/tester-260822-0341-e2e-net.md`).
 *
 * Cố tình KHÔNG cấu hình tải browser mới: máy đã có Playwright 1.62.1 +
 * Chromium cache sẵn (`~/Library/Caches/ms-playwright`). Dùng project mặc
 * định (không set `channel`) để chắc chắn dùng bản Chromium ĐÃ có trong cache,
 * không kích hoạt download bản "chrome"/"msedge" channel khác.
 */
const PORT = 4399;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    acceptDownloads: true,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Playwright tự start + tự dừng server này khi hết chạy — không tự spawn
  // bằng bash để tránh ghost process. Port cố định (4399), reuse nếu đã có
  // sẵn (ví dụ đang chạy `pnpm dev` để debug) thay vì mở port mới.
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
