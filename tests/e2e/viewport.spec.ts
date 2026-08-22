import type { Locator, Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { vi as t } from "../../src/i18n/vi";
import { completeOnboarding } from "./helpers";

/**
 * Flow 6 — Pan/zoom: bánh xe chuột (Ctrl/Cmd+wheel) zoom, nút fit/reset, phím
 * mũi tên pan.
 *
 * Khẳng định hành vi: dịch chuyển/zoom THẬT xảy ra — đọc `style="transform:
 * translate(...) scale(...)"` của layer chứa card+connector trước/sau mỗi
 * tương tác, không chỉ "click không lỗi". Đây là state UI cục bộ
 * (`FamilyTreeCanvas` local `useState`), không phải dữ liệu person/relationship
 * — không bị ảnh hưởng bởi đổi tên cột DB.
 *
 * Chưa phủ (ghi rõ, không giả lập): pinch 2 ngón (touch) — Playwright/Chromium
 * desktop không có input pinch thật, cần bật touch emulation riêng, ngoài
 * phạm vi lưới an toàn cột DB.
 */

function transformLayer(page: Page): Locator {
  // Layer pan/zoom set CẢ HAI `transform: translate(...)` VÀ
  // `transform-origin: 0 0` cùng lúc (xem FamilyTreeCanvas.tsx) — kết hợp 2
  // điều kiện để không trùng với style transform khác (framer-motion dùng
  // translate3d cho card, không khớp "translate(" liền sau). Đọc style đã có
  // sẵn để verify pan/zoom, không phải data-testid tự thêm.
  return page.locator('[style*="translate("][style*="0 0"]');
}

async function readTransform(page: Page): Promise<{ x: number; y: number; scale: number }> {
  const style = await transformLayer(page).getAttribute("style");
  const m = style?.match(/translate\(([-.\d]+)px,\s*([-.\d]+)px\)\s*scale\(([.\d]+)\)/);
  if (!m) throw new Error(`Không đọc được transform từ style: ${style}`);
  return { x: parseFloat(m[1]), y: parseFloat(m[2]), scale: parseFloat(m[3]) };
}

test("pan/zoom: wheel zoom, nút fit/reset, phím mũi tên — canvas dịch chuyển thật", async ({ page }) => {
  await page.goto("/");
  await completeOnboarding(page, "ViewportPerson" + Date.now());

  const canvas = page.getByRole("group", { name: t.viewport.canvasLabel, exact: true });
  await expect(canvas).toBeVisible();

  // ── Reset — mốc xuất phát xác định (0,0, scale 1). ──────────────────────
  await page.getByRole("button", { name: t.viewport.reset, exact: true }).click();
  const afterReset = await readTransform(page);
  expect(afterReset).toEqual({ x: 0, y: 0, scale: 1 });

  // ── Nút Zoom In / Zoom Out — scale đổi đúng hướng. ──────────────────────
  await page.getByRole("button", { name: t.viewport.zoomIn, exact: true }).click();
  const afterZoomIn = await readTransform(page);
  expect(afterZoomIn.scale).toBeGreaterThan(afterReset.scale);

  await page.getByRole("button", { name: t.viewport.zoomOut, exact: true }).click();
  const afterZoomOut = await readTransform(page);
  expect(afterZoomOut.scale).toBeLessThan(afterZoomIn.scale);

  // ── Ctrl+wheel — zoom thật qua sự kiện wheel (không phải click nút). ────
  await page.getByRole("button", { name: t.viewport.reset, exact: true }).click();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas không có bounding box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -200); // deltaY âm ⇒ zoom IN quanh điểm con trỏ
  await page.keyboard.up("Control");
  const afterWheelZoom = await readTransform(page);
  expect(afterWheelZoom.scale).toBeGreaterThan(1);

  // ── Nút Fit — bao lại toàn bộ node, transform đổi khỏi trạng thái lệch trên. ─
  await page.getByRole("button", { name: t.viewport.fit, exact: true }).click();
  const afterFit = await readTransform(page);
  expect(afterFit).not.toEqual(afterWheelZoom);

  // ── Phím mũi tên — pan đúng ARROW_PAN_STEP (80px), focus container trước
  // (không click, để không lỡ chọn/bỏ chọn card nào). ──────────────────────
  await page.getByRole("button", { name: t.viewport.reset, exact: true }).click();
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  const afterArrowRight = await readTransform(page);
  expect(afterArrowRight).toEqual({ x: -80, y: 0, scale: 1 });

  await page.keyboard.press("ArrowLeft");
  const afterArrowLeft = await readTransform(page);
  expect(afterArrowLeft).toEqual({ x: 0, y: 0, scale: 1 });

  await page.keyboard.press("ArrowDown");
  const afterArrowDown = await readTransform(page);
  expect(afterArrowDown).toEqual({ x: 0, y: -80, scale: 1 });
});
