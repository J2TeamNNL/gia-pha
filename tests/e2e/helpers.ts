import type { Page } from "@playwright/test";
import { expect } from "./fixtures";
import { vi as t } from "../../src/i18n/vi";

/**
 * Chuỗi selector — LẤY TỪ `src/i18n/vi.ts` (đọc-only), KHÔNG hardcode lại giá
 * trị, để nếu ai đổi bản dịch VI, test tự theo (miễn hành vi không đổi).
 * Vài chuỗi trong QuickAddForm.tsx/PersonCard.tsx đang hardcode tiếng Việt
 * (bug ghi trong `CLAUDE.md` — không theo locale) — với các chuỗi đó, ta phải
 * literal-match đúng những gì component render, ghi rõ trong comment.
 */

export async function fillNameFields(
  page: Page,
  opts: { firstName: string; middleName?: string; lastName?: string },
) {
  // Nhãn "Tên" đi kèm dấu `*` bắt buộc trong cùng <label> -> accessible name
  // đầy đủ là "Tên *". Dùng exact để không khớp nhầm "Tên đệm (tùy chọn)".
  await page
    .getByRole("textbox", { name: `${t.form.firstName} ${t.form.required}`, exact: true })
    .fill(opts.firstName);
  if (opts.middleName) {
    await page.getByRole("textbox", { name: t.form.middleName, exact: true }).fill(opts.middleName);
  }
  if (opts.lastName) {
    // CHỈ dùng khi chắc chưa có surname suggestion nào (nếu không, label đổi
    // thành "Họ (gợi ý: ...)" và exact match sẽ trượt).
    await page.getByRole("textbox", { name: t.form.lastName, exact: true }).fill(opts.lastName);
  }
}

/** Onboarding — luồng nhập người đầu tiên (bản thân). */
export async function completeOnboarding(page: Page, firstName: string) {
  await expect(page.getByRole("heading", { name: t.onboarding.title })).toBeVisible();
  await fillNameFields(page, { firstName });
  await page.getByRole("button", { name: t.onboarding.startButton }).click();
  // Onboarding biến mất, canvas chính hiện ra với đúng 1 thành viên.
  await expectMemberCount(page, 1);
}

/** Badge số liệu trên canvas: "<N> thành viên" — text thấy được, không phải DOM nội bộ. */
export function memberCountText(n: number): RegExp {
  return new RegExp(`${n}\\s*${escapeRegex(t.canvas.membersCount)}`);
}

export async function expectMemberCount(page: Page, n: number) {
  await expect(page.getByText(memberCountText(n))).toBeVisible();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Chọn (click) một PersonCard theo tên hiển thị — card là <button> chứa tên. */
export function personCard(page: Page, displayNameSubstring: string) {
  return page.getByRole("button", { name: new RegExp(escapeRegex(displayNameSubstring)) });
}

export async function selectPersonCard(page: Page, displayNameSubstring: string) {
  await personCard(page, displayNameSubstring).click();
}

type AddDirectionLabel = "Thêm cha/mẹ" | "Thêm con" | "Thêm vợ/chồng" | "Thêm anh/chị/em";

/**
 * 4 nút thêm quan hệ trên PersonCard đang hardcode tiếng Việt trong
 * `PersonCard.tsx` (không đi qua `t.*`) — không phải file ta sở hữu, nên
 * literal-match đúng string hiện tại, ghi rõ đây là hành vi hiện tại, không
 * phải hợp đồng ta tự đặt ra.
 */
export async function clickAddButton(page: Page, label: AddDirectionLabel) {
  await page.getByRole("button", { name: label, exact: true }).click();
}

/** Điền + lưu QuickAddForm đang mở (form phải đã mở trước khi gọi). */
export async function fillAndSaveQuickAdd(page: Page, firstName: string) {
  await fillNameFields(page, { firstName });
  await page.getByRole("button", { name: t.form.save, exact: true }).click();
}
