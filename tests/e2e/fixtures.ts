import { test as base, expect } from "@playwright/test";

/**
 * `test` mở rộng: tự bắt `console.error` + uncaught exception trên MỌI test,
 * fail test nếu có — đúng yêu cầu "Không có lỗi console trong mọi luồng".
 *
 * Mỗi test Playwright đã chạy trong MỘT BrowserContext MỚI theo mặc định (xem
 * `page` fixture) — tức là IndexedDB/localStorage đã sạch từ đầu mỗi test,
 * không cần dọn tay.
 */
export const test = base.extend<{ failOnConsoleErrors: void }>({
  failOnConsoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      const onConsole = (msg: import("@playwright/test").ConsoleMessage) => {
        if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
      };
      const onPageError = (err: Error) => {
        errors.push(`uncaught exception: ${err.message}`);
      };
      page.on("console", onConsole);
      page.on("pageerror", onPageError);

      await use();

      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      expect(errors, `Console/lỗi JS phát sinh trong luồng:\n${errors.join("\n")}`).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
