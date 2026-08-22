# Phase 1B — Interaction + A11y (tương tác + tiếp cận)

Nguồn spec: `docs/tree-layout.md` §9, §10. Không sửa `src/lib/tree-layout.ts` (đọc-only). 3 gate: `pnpm test` 39/39, `pnpm lint` 0 lỗi, `pnpm build` PASS — xanh sau khi sửa.

## 1. Đổi gì

**`src/components/FamilyTreeCanvas.tsx`** — thay `motion.div drag` bằng viewport tự viết:
- State `{x,y,scale}` áp CSS `transform: translate() scale()` lên layer chứa card+connector (thay cho div drag cũ).
- `onWheel`: không Ctrl/Cmd → pan (`deltaX/deltaY`); Ctrl/Cmd+wheel (bao gồm pinch trackpad Chrome/Firefox phát ra) → zoom quanh điểm con trỏ.
- `onTouchStart/Move/End`: 1 ngón → pan (có threshold 6px phân biệt tap/pan — tap thật vẫn phát sinh click bình thường trên nút card); 2 ngón → pinch-zoom quanh trung điểm.
- `keydown` gắn qua callback-ref trên container (`tabIndex=0`, focus-visible ring) — Arrow×4 pan 80px/lần, `Home` reset. Callback-ref (không phải `useEffect([deps cố định])`) để không bỏ lỡ lần mount đầu (early-return loadError/empty không render container).
- 4 nút `size-11` (44px): Zoom In / Zoom Out / Fit / Reset (`t.viewport.*`), `aria-label` + `title`.
- Auto-fit MỘT LẦN khi có dữ liệu lần đầu (giải quyết đúng bug đo được: anchor cách gốc 360px, sát đáy màn 390×844) — không ghi đè pan/zoom user tự chỉnh sau đó.
- `fitToView()` quét `layout.nodes` (TẤT CẢ, không riêng nhánh anchor) → bao mọi component của forest.
- `<svg>` connector: thêm `aria-hidden="true"`.
- Container: `overscroll-contain touch-none` (tự chặn scroll-chaining/pinch trình duyệt, để JS toàn quyền).
- `loadError` branch giữ nguyên y hệt — không đụng.

**`src/components/PersonCard.tsx`**:
- 4 nút thêm + nút "đặt làm trung tâm": `size-7`(28px)/`size-5`(20px) → `size-11`(44px).
- Nút "đặt làm trung tâm": `opacity-0 group-hover:opacity-100` (focus được khi vô hình — bẫy focus) → thêm `focus-visible:opacity-100` + `aria-label`.
- Badge anchor: `text-white` trên `bg-amber-400/90` → `text-stone-900` (+ icon Star `fill-stone-900`).
- Text năm sinh/mất: `text-stone-400` → `text-stone-500`.
- `usePrefersReducedMotion()` — tắt `whileHover`/`whileTap` card + transition mở 4 nút khi user đặt `prefers-reduced-motion: reduce`.
- Bỏ `hover:scale-110` trên 4 nút thêm (không dựa hover, đỡ giật khi to hơn).

**`src/components/SidePanel.tsx`**:
- Nút đóng: `p-1.5` (28px), không tên → `size-11` (44px) + `title`/`aria-label` (Đóng/Close theo `locale`, đúng pattern ternary đã dùng sẵn trong file).
- `pr-8`→`pr-12` ở header row để chừa chỗ nút to hơn.
- `usePrefersReducedMotion()` cho transition trượt panel.

**`src/i18n/vi.ts` / `en.ts`**: thêm `Dictionary.viewport` (`zoomIn/zoomOut/fit/reset/canvasLabel`).

**`src/store/treeStore.ts`**: không đổi (đọc, xác nhận không cần state view mới ở store — state viewport là local UI state, không cần persist/share).

## 2. Contrast trước → sau (tính thật bằng công thức WCAG sRGB, script `/private/tmp/.../scratchpad/contrast.mjs`)

| Chỗ | Trước | Sau | Ngưỡng |
|---|---|---|---|
| Badge anchor: chữ trên `amber-400` | `#fff` vs `#fbbf24` = **1.67:1** | `#1c1917` (stone-900) vs `#fbbf24` = **10.48:1** | ≥4.5:1 ✓ |
| Năm sinh/mất `text-[9px]` | `#fff` vs `#a8a29e` (stone-400) = **2.52:1** | `#fff` vs `#78716c` (stone-500) = **4.80:1** | ≥4.5:1 ✓ |

Khớp số đo trong `docs/tree-layout.md` §10 (1.7:1, 2.5:1).

## 3. Touch target ≥44px — đã sửa

| Nút | Trước | Sau |
|---|---|---|
| 4 nút thêm quan hệ (PersonCard) | 28px (`size-7`) | 44px (`size-11`) |
| Nút "đặt làm trung tâm" (PersonCard) | 20px (`size-5`) | 44px (`size-11`) |
| Nút đóng SidePanel | ~28px (`p-1.5`+icon 16px) | 44px (`size-11`) |
| Zoom In/Out/Fit/Reset (mới) | — | 44px (`size-11`) mỗi nút |

## 4. Zoom giữ điểm neo — chứng minh

Công thức `zoomAt(px,py,factor)`: với `t={x,y,scale}`, `newScale=clamp(scale·factor)`, `ratio=newScale/scale`:
```
x' = px - (px - x)·ratio
y' = py - (py - y)·ratio
```
Toạ độ nội dung dưới con trỏ trước/sau: `L = (p - t.xy)/t.scale`. Thay `t'` vào: `L' = (p - x')/newScale = (p - px + (px-x)·ratio)/newScale`. Vì `p=px` tại điểm neo, `L' = (px-x)·ratio/newScale = (px-x)/scale = L` — bất biến. Kiểm bằng script Node (`zoom-anchor-check.mjs`): `before {x:213,y:412} after {x:213,y:412}` sau khi zoom 1.6× tại `(250,400)` — delta = `(0,0)`. Áp dụng nguyên vẹn cho wheel(ctrl), 2 nút zoom (neo = tâm khung), và pinch (neo = trung điểm 2 ngón, tính lại mỗi frame).

## 5. Việc còn lại / không làm (đúng phạm vi)

- Dot-LOD dưới 25% zoom (docs §4) — KHÔNG làm, ngoài phạm vi phase này.
- Font-size điều chỉnh được cho người cao tuổi (docs §10, "không phải tuỳ chọn phụ") — KHÔNG làm, đây là feature riêng chưa được giao.
- Safe-area inset / `dvh` / `overscroll-behavior` cấp trang — thuộc `page.tsx`/`layout.tsx`, KHÔNG được sửa (agent PWA khác đang giữ `layout.tsx`+`public/`; `page.tsx` không có trong danh sách file được giao).
- `title_prefix`/tên nút thêm quan hệ trong `PersonCard.tsx` vẫn hardcode tiếng Việt (không theo `locale`) — bug tồn tại từ trước, không phải phạm vi yêu cầu, không đụng.

## Câu hỏi chưa giải

- Auto-fit-once khi có dữ liệu lần đầu là quyết định thêm (không có trong 6 mục yêu cầu, nhưng giải đúng bug đo được ở docs §9). Nếu không muốn hành vi này (ví dụ muốn giữ y nguyên vị trí mặc định cũ), có thể bỏ effect này — code đã tách riêng, dễ revert.
- Ngưỡng zoom `MIN_SCALE=0.2`/`MAX_SCALE=3` và `ARROW_PAN_STEP=80px` là số chọn hợp lý theo cảm quan, chưa có số đo thực tế đối thủ cho các giá trị này (docs không có).

Status: DONE
Summary: Thêm scroll-pan, wheel/pinch/nút zoom giữ điểm neo (chứng minh toán học + script), arrow-key pan, nút fit/reset bao cả forest, sửa 2 contrast fail + mọi touch target <44px + bẫy focus vô hình + prefers-reduced-motion + SVG/nút thiếu tên; test 39/39, lint 0, build PASS.
Concerns/Blockers: không có — 2 câu hỏi mở ở trên là quyết định thiết kế phụ, không chặn.
