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

test("searches members by unaccented text and selects the reference person via keyboard", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => crossOriginIsolated)).toBe(true);

  await page.getByLabel("Tên cây gia phả mới").fill("Cây Tìm Kiếm");
  await page.getByRole("button", { name: "Tạo cây" }).click();
  await page.locator("#ob-first").fill("Nguyễn Đức");
  await page.getByRole("button", { name: "Bắt đầu" }).click();
  await expect(page.getByText("Nguyễn Đức", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Thêm thành viên" }).click();
  await page.getByPlaceholder("vd: An / John").fill("Trần Bình");
  await page.getByRole("button", { name: "Lưu thành viên" }).click();
  await expect(page.getByText("Trần Bình", { exact: true })).toBeVisible();

  // Diacritic-insensitive search plus arrow/enter keyboard selection.
  const search = page.getByRole("combobox", { name: "Tìm kiếm thành viên" });
  await search.fill("binh");
  await expect(page.getByRole("option", { name: /Trần Bình/ })).toBeVisible();
  await search.press("Enter");

  // The details panel opens for the chosen person with a reference action.
  const panel = page.getByRole("button", { name: "Đặt làm trung tâm" });
  await expect(panel).toBeVisible();
  await panel.click();
  await expect(page.getByText("⭐ Bản thân")).toBeVisible();

  // Escape closes the panel.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Đóng bảng thông tin" })).not.toBeVisible();
});
