import { readFileSync } from "node:fs";
import { test, expect } from "./fixtures";
import { vi as t } from "../../src/i18n/vi";
import {
  clickAddButton,
  completeOnboarding,
  expectMemberCount,
  fillAndSaveQuickAdd,
  personCard,
  selectPersonCard,
} from "./helpers";

/**
 * Flow 4 + 5 — Export file rồi Import LẠI ĐÚNG FILE ĐÓ.
 *
 * Kịch bản: export lúc cây có 1 người (P1) → thêm 1 người nữa (P2, cây có 2)
 * → import lại file cũ (1 người) → dialog phải hiện ĐÚNG 2 số: cây hiện tại
 * (2) và file sắp nhập (1) → xác nhận → cây trở lại đúng 1 người (P1, P2 mất)
 * → reload vẫn đúng.
 *
 * Cố tình tạo lệch số (2 vs 1) thay vì export-rồi-import-ngay (sẽ luôn ra
 * 1 vs 1, không chứng minh được dialog đọc đúng SỐ THẬT của từng file).
 *
 * Bài học phát hiện được (xem `src/db/backup.ts` `restoreFromBackup`): xác
 * nhận import KHI CÂY HIỆN TẠI KHÔNG RỖNG sẽ tự kích hoạt thêm MỘT lượt
 * download "backup an toàn" của cây hiện tại (trước khi thay) — test phải
 * chờ ĐÚNG 2 lượt download (không phải 1), nếu không sẽ treo tới khi timeout.
 */
test("export rồi import lại đúng file — cây đúng sau reload", async ({ page }) => {
  await page.goto("/");
  const p1 = "BackupKeep" + Date.now();
  await completeOnboarding(page, p1);
  await expectMemberCount(page, 1);

  // 4. Export lúc cây có 1 người.
  const [download1] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: t.backup.export, exact: true }).click(),
  ]);
  const exportedPath = await download1.path();
  expect(exportedPath).toBeTruthy();
  const exportedBytes = readFileSync(exportedPath!);
  expect(exportedBytes.byteLength).toBeGreaterThan(0);
  await expect(page.getByText(new RegExp(`${t.backup.exported}.*1 ${t.backup.persons}`))).toBeVisible();

  // Thêm người thứ 2 — cây hiện tại lệch số so với file vừa export.
  await selectPersonCard(page, p1);
  const p2 = "BackupExtra" + Date.now();
  await clickAddButton(page, "Thêm con");
  await fillAndSaveQuickAdd(page, p2);
  await expectMemberCount(page, 2);

  // 5. Import lại file cũ (setInputFiles trực tiếp — bỏ qua OS file dialog,
  // input vẫn `class="hidden"` nhưng Playwright cho phép set file trên input
  // ẩn qua CSS, không cần click nút "Nhập file" trước).
  await page.locator('input[type="file"]').setInputFiles(exportedPath!);

  await expect(page.getByText(t.backup.confirmTitle)).toBeVisible();
  // Dialog hiện ĐÚNG số của CẢ HAI bên: cây hiện tại = 2, file sắp nhập = 1.
  const currentBlock = page.getByText(t.backup.currentTree).locator("..");
  const incomingBlock = page.getByText(t.backup.incomingFile).locator("..");
  await expect(currentBlock).toContainText(`2 ${t.backup.persons}`);
  await expect(incomingBlock).toContainText(`1 ${t.backup.persons}`);

  // Xác nhận — restoreFromBackup() TỰ tải về một bản backup an toàn của cây
  // hiện tại (2 người) trước khi thay, nên có lượt download thứ 2 ở đây.
  const [safetyDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: t.backup.confirm, exact: true }).click(),
  ]);
  const safetyPath = await safetyDownload.path();
  expect(safetyPath).toBeTruthy();
  expect(readFileSync(safetyPath!).byteLength).toBeGreaterThan(0);

  // Cây trở lại đúng 1 người — P2 (chỉ có trong bản 2-người) đã biến mất.
  await expectMemberCount(page, 1);
  await expect(personCard(page, p1)).toBeVisible();
  await expect(personCard(page, p2)).toHaveCount(0);

  await page.reload();
  await expectMemberCount(page, 1);
  await expect(personCard(page, p1)).toBeVisible();
  await expect(personCard(page, p2)).toHaveCount(0);
});
