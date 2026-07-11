import { expect, test } from "@playwright/test";

test("manages isolated family trees with confirmed deletion", async ({ page }) => {
  await page.goto("/");

  await expect.poll(() => page.evaluate(() => crossOriginIsolated)).toBe(true);
  await page.getByLabel("Tên cây gia phả mới").fill("Cây Nguyễn");
  await page.getByRole("button", { name: "Tạo cây" }).click();
  await expect(page.getByRole("button", { name: "Bắt đầu" })).toBeVisible();

  await page.locator("#ob-first").fill("Nguyễn Persist");
  await page.getByRole("button", { name: "Bắt đầu" }).click();
  await expect(page.getByText("Nguyễn Persist", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Nguyễn Persist", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Cây" }).click();
  await page.getByLabel("Tên cây gia phả mới").fill("Cây Trần");
  await page.getByRole("button", { name: "Tạo cây" }).click();
  await expect(page.getByText("Cây Trần", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Mở", exact: true }).click();
  await expect(page.getByRole("button", { name: "Bắt đầu" })).toBeVisible();
  await page.locator("#ob-first").fill("Trần Isolated");
  await page.getByRole("button", { name: "Bắt đầu" }).click();
  await expect(page.getByText("Trần Isolated", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Cây" }).click();
  await page.getByRole("button", { name: "Mở", exact: true }).click();
  await expect(page.getByText("Nguyễn Persist", { exact: true })).toBeVisible();
  await expect(page.getByText("Trần Isolated", { exact: true })).not.toBeVisible();

  await page.getByRole("button", { name: "Cây" }).click();
  await page.getByLabel("Đổi tên Cây Nguyễn").click();
  await page.getByLabel("Tên cây gia phả", { exact: true }).fill("Cây Nguyễn Mới");
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(page.getByText("Cây Nguyễn Mới", { exact: true })).toBeVisible();
  await page.getByLabel("Xóa Cây Trần").click();
  await expect(page.getByText("Xóa vĩnh viễn “Cây Trần” và toàn bộ dữ liệu trong cây này?")).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận xóa" }).click();
  await expect(page.getByText("Cây Trần", { exact: true })).not.toBeVisible();
});
