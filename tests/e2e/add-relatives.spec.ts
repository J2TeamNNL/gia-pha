import { test, expect } from "./fixtures";
import {
  clickAddButton,
  completeOnboarding,
  expectMemberCount,
  fillAndSaveQuickAdd,
  personCard,
  selectPersonCard,
} from "./helpers";

/**
 * Flow 2 — Thêm cha/mẹ, con, vợ/chồng từ card đã chọn. Cây hiện đủ, reload vẫn còn.
 *
 * Khẳng định hành vi: sau khi thêm, (a) card mới xuất hiện với TÊN đúng, (b)
 * badge vai vế đúng (Cha/Con trai/Chồng — suy ra từ quan hệ, không phải field
 * tĩnh trên person), (c) badge số lượng thành viên tăng đúng, (d) mọi thứ
 * còn nguyên sau reload trang thật.
 *
 * Sống sót qua đổi tên cột / đổi bảng `relationships`→`unions`+`parentages`:
 * không assert cấu trúc quan hệ nội bộ, chỉ assert NHÃN VAI VẾ hiển thị (suy
 * ra bởi `getRelationLabel` từ dữ liệu quan hệ — hành vi observable, không
 * phải tên cột/tên bảng).
 */
test("thêm cha/mẹ, con, vợ/chồng — cây hiện đủ và còn sau reload", async ({ page }) => {
  await page.goto("/");
  const self = "Anchor" + Date.now();
  await completeOnboarding(page, self);

  await selectPersonCard(page, self);

  const parent = "ParentX" + Date.now();
  await clickAddButton(page, "Thêm cha/mẹ");
  await expect(page.getByText("Thêm cha/mẹ")).toBeVisible(); // header form đúng ngữ cảnh
  await fillAndSaveQuickAdd(page, parent);
  await expectMemberCount(page, 2);
  await expect(personCard(page, parent)).toBeVisible();
  await expect(page.getByText("Cha", { exact: true })).toBeVisible();

  const child = "ChildX" + Date.now();
  await clickAddButton(page, "Thêm con");
  await fillAndSaveQuickAdd(page, child);
  await expectMemberCount(page, 3);
  await expect(personCard(page, child)).toBeVisible();
  await expect(page.getByText("Con trai", { exact: true })).toBeVisible();

  const spouse = "SpouseX" + Date.now();
  await clickAddButton(page, "Thêm vợ/chồng");
  await fillAndSaveQuickAdd(page, spouse);
  await expectMemberCount(page, 4);
  await expect(personCard(page, spouse)).toBeVisible();
  await expect(page.getByText("Chồng", { exact: true })).toBeVisible();

  await page.reload();

  await expectMemberCount(page, 4);
  for (const name of [self, parent, child, spouse]) {
    await expect(personCard(page, name)).toBeVisible();
  }
});
