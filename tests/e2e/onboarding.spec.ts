import { test, expect } from "./fixtures";
import { vi as t } from "../../src/i18n/vi";
import { completeOnboarding, expectMemberCount, personCard } from "./helpers";

/**
 * Flow 1 — Onboarding + persistence IndexedDB thật.
 *
 * Khẳng định hành vi: mở app lần đầu (storage sạch) → nhập một người → cây
 * hiện đúng người đó → reload TOÀN TRANG (page.reload thật, không phải state
 * React) → người đó vẫn còn.
 *
 * Sống sót qua đổi tên cột `first_name`→`given_name` vì: không đọc field nào
 * qua DOM/API nội bộ — chỉ đọc TEXT hiển thị (tên trên card, badge số lượng
 * thành viên) và role/label công khai (heading, textbox theo nhãn, button).
 */
test("onboarding: nhập người đầu tiên, cây hiện đúng, reload vẫn còn", async ({ page }) => {
  await page.goto("/");

  const firstName = "Onboard" + Date.now();
  await completeOnboarding(page, firstName);

  // Card của người vừa tạo hiện trên canvas, được đánh dấu "Nhân vật trung tâm".
  await expect(personCard(page, firstName)).toBeVisible();
  await expect(page.getByText("Nhân vật trung tâm")).toBeVisible();

  // Reload THẬT (không phải soft-navigation) — buộc app đọc lại từ IndexedDB.
  await page.reload();

  await expectMemberCount(page, 1);
  await expect(personCard(page, firstName)).toBeVisible();
  // Không còn thấy màn hình onboarding sau reload.
  await expect(page.getByRole("heading", { name: t.onboarding.title })).not.toBeVisible();
});
