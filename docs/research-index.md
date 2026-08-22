# Mục lục research

Mọi research của dự án nằm ở `plans/reports/`. File này là đường vào — để lần sau khỏi phải `grep` cả repo.

**Quy ước:** `docs/` khẳng định · `plans/reports/` chứng minh. Report **mục theo thời gian** — đừng coi
report cũ là authority. Khi report cũ và `docs/` xung đột, `docs/` thắng, còn report chỉ kể lại lúc đó
người ta thấy gì.

Ghi nguồn của các bên ngoài: [`credits.md`](credits.md).

---

## Nếu bạn muốn biết…

| Câu hỏi | Đọc |
|---|---|
| Người dùng Việt thật sự chê gì các app gia phả | `reports/fb-research/` (5 file) |
| Đối thủ mạnh nhất làm được gì, thiếu gì | 2 file teardown KinTree bên dưới |
| Vì sao tên phải tách ba phần, vì sao `is_leap_month` bắt buộc | [`culture-vietnam.md`](culture-vietnam.md), rồi `reports/web-recon-…` |
| Vì sao stack là Vite + OPFS | [`decisions.md`](decisions.md) mục 1, rồi `reports/analysis-260822-1833-…` |
| Thuật toán âm lịch đúng tới đâu, biên ở đâu | `reports/fullstack-260822-0341-lunar-calendar.md` |
| Data model v2 được thiết kế thế nào | `260821-2350-restructure-v1/proposal-data-model.md` |

---

## 1. Đối thủ — bằng chứng đo trực tiếp

Nhóm giá trị nhất. Đây là nguồn của gần như mọi luật trong `culture-vietnam.md`.

| Report | Đo cái gì | Ngày |
|---|---|---|
| [`kintree-recon-260822-1931-app-teardown-logged-in.md`](../plans/reports/kintree-recon-260822-1931-app-teardown-logged-in.md) | KinTree v1.0.5 sau đăng nhập: 8 field/người, tên là MỘT chuỗi, **có âm lịch nhưng KHÔNG có tháng nhuận**, export JSON miễn phí, sync là PRO, 76 bài Văn Khấn | 2026-08-22 |
| [`kintree-recon-260821-2312-android-teardown.md`](../plans/reports/kintree-recon-260821-2312-android-teardown.md) | Teardown APK KinTree (570 dòng) | 2026-08-21 |
| [`web-recon-260821-2312-competitor-web-demos.md`](../plans/reports/web-recon-260821-2312-competitor-web-demos.md) | Chạy thật demo web của đối thủ, gồm gia phả họ Võ 292 người | 2026-08-21 |
| [`analysis-260228-legacy-ancestortree.md`](../plans/reports/analysis-260228-legacy-ancestortree.md) · [`-gia-pha-dien-tu`](../plans/reports/analysis-260228-legacy-gia-pha-dien-tu.md) · [`-giapha-os`](../plans/reports/analysis-260228-legacy-giapha-os.md) | Đọc code 3 repo mã nguồn mở | 2026-02-28 |

**Phản hồi người dùng thật** — `reports/fb-research/`: [`giapha-dien-tu`](../plans/reports/fb-research/giapha-dien-tu.md) ·
[`giapha-os`](../plans/reports/fb-research/giapha-os.md) · [`ancestortree`](../plans/reports/fb-research/ancestortree.md) ·
[`kintree-app`](../plans/reports/fb-research/kintree-app.md) · [`kintree-launch`](../plans/reports/fb-research/kintree-launch.md) ·
và [`codex-cross-review`](../plans/reports/fb-research/codex-cross-review.md) (phản biện độc lập chính research đó).

## 2. Thiết kế — đề xuất và spec

| Tài liệu | Nội dung |
|---|---|
| [`proposal-data-model.md`](../plans/260821-2350-restructure-v1/proposal-data-model.md) | Data model v2 (559 dòng) |
| [`proposal-kinship.md`](../plans/260821-2350-restructure-v1/proposal-kinship.md) | Spec engine xưng hô / vai vế |
| [`migration.md`](../plans/260821-2350-restructure-v1/migration.md) | Thiết kế migration v0/v1 → v2 (552 dòng) |
| [`proposal-review.md`](../plans/260821-2350-restructure-v1/proposal-review.md) | Đề xuất chờ duyệt |

⚠️ Ba file đầu viết cho stack **cũ** (Next.js + sql.js). Ý tưởng data model còn giá trị; tên bảng và
API thì đã lệch so với schema hiện tại trong `src/db/schema.ts`.

## 3. Review — do 4 reviewer độc lập, trên stack cũ

| Report | Phạm vi |
|---|---|
| [`reviewer-…-data-model-db.md`](../plans/reports/reviewer-260821-2312-data-model-db.md) | Data model + tầng DB |
| [`reviewer-…-canvas-ux.md`](../plans/reports/reviewer-260821-2312-canvas-ux.md) | Vẽ cây + UX (274 dòng) |
| [`reviewer-…-sync-security-pwa.md`](../plans/reports/reviewer-260821-2312-sync-security-pwa.md) | Sync, bảo mật, quyền riêng tư, PWA (358 dòng) |
| [`reviewer-…-architecture-state.md`](../plans/reports/reviewer-260821-2312-architecture-state.md) | Kiến trúc + quản lý state |

⚠️ Đo trên stack **cũ**. Phát hiện về **UX, quyền riêng tư và luật domain** phần lớn còn đúng vì không
phụ thuộc framework. Phát hiện về sql.js / IndexedDB thì đã hết áp dụng.

## 4. Triển khai — vì sao code ra như vậy

| Report | Chủ đề | Còn áp dụng? |
|---|---|---|
| [`fullstack-260822-0341-lunar-calendar.md`](../plans/reports/fullstack-260822-0341-lunar-calendar.md) | Âm lịch: thuật toán, mốc đối chiếu, biên năm | **CÒN** — `src/lib/lunar-calendar.ts` trích tới file này |
| [`fullstack-260822-0157-phase1a-durability.md`](../plans/reports/fullstack-260822-0157-phase1a-durability.md) | Hai đường mất dữ liệu và cách bịt | phần lý lẽ còn, code đã đổi |
| [`fullstack-260822-0157-phase1b-canvas.md`](../plans/reports/fullstack-260822-0157-phase1b-canvas.md) | Hình học layout, 3 bug đã đo được | phần hình học còn |
| [`fullstack-260822-0157-phase1b2-interaction.md`](../plans/reports/fullstack-260822-0157-phase1b2-interaction.md) | Tương tác + a11y | còn |
| [`fullstack-260822-0157-phase3-pwa.md`](../plans/reports/fullstack-260822-0157-phase3-pwa.md) | PWA installable | lý lẽ còn, SW đã viết lại cho Vite |
| [`tester-260822-0157-phase0-harness.md`](../plans/reports/tester-260822-0157-phase0-harness.md) | Test harness | harness đã đổi sang vitest |
| [`tester-260822-0341-e2e-net.md`](../plans/reports/tester-260822-0341-e2e-net.md) | Lưới e2e cho refactor data model | còn |
| [`docs-260822-0157-sync-after-phase01.md`](../plans/reports/docs-260822-0157-sync-after-phase01.md) | Đồng bộ docs sau Phase 0+1 | lịch sử |

## 5. Quyết định stack

| Report | Nội dung |
|---|---|
| [`analysis-260822-1833-fork-main-vs-origin.md`](../plans/reports/analysis-260822-1833-fork-main-vs-origin.md) | So sánh hai nhánh loại trừ nhau, đo thật cả hai bên, dẫn tới quyết định ở [`decisions.md`](decisions.md) mục 1 |

---

## Viết report mới thì đặt tên thế nào

`plans/reports/{loại}-{YYMMDD}-{HHMM}-{slug}.md` — `{loại}` là vai hoặc kiểu việc
(`analysis`, `reviewer`, `tester`, `kintree-recon`, `web-recon`, `fullstack`).

Ba luật giữ cho report còn dùng được về sau:

1. **Ghi ngày đo và phiên bản/commit đã đo.** Report không có ngày là report không kiểm chứng lại được.
2. **Phân biệt [đo] / [dẫn] / [suy]** — cái tự tay đo, cái trích người thật, cái suy luận. Quy ước này
   bắt đầu từ `culture-vietnam.md`, giữ nguyên.
3. **Liệt kê câu chưa trả lời được ở cuối.** Chỗ đó là việc của lần sau.

## Câu chưa trả lời được

1. `docs/` và `.docs/` (snapshot theo version, do nhánh Vite mang sang) đang **cùng tồn tại**, và
   `CLAUDE.md` hiện trỏ `.docs/README.md` làm đường vào. Chưa quyết cái nào là chuẩn — xem
   [`decisions.md`](decisions.md).
2. Chưa có report nào đo **tab Lịch** của KinTree; nghi là lịch âm + nhắc giỗ.
3. Ca `con dâu` / `cháu dâu` (invariant #4) chưa được kiểm trên đối thủ nào — cần ghi dữ liệu vào app họ.
