import { test, expect } from "./fixtures";
import { vi as t } from "../../src/i18n/vi";
import { clickAddButton, completeOnboarding, expectMemberCount, fillNameFields, selectPersonCard } from "./helpers";

/**
 * Flow 3 — "Thêm anh/chị/em" khi người được chọn CHƯA có cha/mẹ ghi nhận.
 *
 * Người tự onboarding (bản thân) không có cha/mẹ nào trong cây — điều kiện
 * đúng để kích hoạt guard trong `QuickAddForm.handleSubmit` (không thể xác
 * định "anh/chị/em của ai" nếu không có cha/mẹ chung).
 *
 * Khẳng định hành vi: (a) lỗi hiện đúng chuỗi `t.form.errors.siblingNeedsParent`,
 * (b) KHÔNG có người mới nào được tạo — số thành viên không tăng, cả ngay sau
 * lỗi và sau khi reload trang (loại trừ khả năng ghi orphan rồi báo lỗi giả).
 *
 * Sống sót qua refactor: không assert bảng/cột quan hệ nội bộ — chỉ assert
 * text lỗi thấy được và đếm thành viên qua badge hiển thị.
 */
test("thêm anh/chị/em khi chưa có cha/mẹ → lỗi, không tạo ai", async ({ page }) => {
  await page.goto("/");
  const self = "NoParent" + Date.now();
  await completeOnboarding(page, self);
  await expectMemberCount(page, 1);

  await selectPersonCard(page, self);
  await clickAddButton(page, "Thêm anh/chị/em");

  const attemptedName = "GhostSibling" + Date.now();
  await fillNameFields(page, { firstName: attemptedName });
  await page.getByRole("button", { name: t.form.save, exact: true }).click();

  await expect(page.getByText(t.form.errors.siblingNeedsParent)).toBeVisible();
  // Form KHÔNG đóng sau lỗi — chứng minh không có "thành công giả".
  await expect(page.getByRole("button", { name: t.form.save, exact: true })).toBeVisible();

  // Không có người mới nào được ghi ngay sau lỗi.
  await expectMemberCount(page, 1);

  await page.reload();
  await expectMemberCount(page, 1);
  await expect(page.getByRole("button", { name: new RegExp(attemptedName) })).toHaveCount(0);
});
