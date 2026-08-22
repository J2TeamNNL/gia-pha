# Luật layout cây gia phả

> Kiểm chứng: 2026-08-22. Số đo đối thủ ở §1, §4–§6 là **đo trực tiếp trong browser** trên sản phẩm đang chạy của đối thủ. §2, §3, §7, §12 cập nhật theo cách sửa thật đã kiểm chứng bằng test (`tests/tree-layout.test.ts`, 10 case, PASS — chạy `pnpm test`).
> Nguồn: `plans/reports/web-recon-260821-2312-competitor-web-demos.md`, `plans/reports/reviewer-260821-2312-canvas-ux.md` (đo đối thủ + phát hiện lỗi ban đầu); `plans/reports/fullstack-260822-0157-phase1b-canvas.md` (Phase 1B — sửa lỗi, thuật toán hiện tại).

## 1. Công thức đúng — đã đo được

Hai sản phẩm đối thủ còn chạy được đều có **variance hàng thế hệ = 0 px**:

| Site | Toạ độ y của card theo đời |
|---|---|
| `gia-pha-demo` | {0, 160, 320, 480} |
| `tocvoquangngai` (398 card) | {0, 375, 750, 1125, 1500} |

Họ làm được nhờ đúng hai điều:

1. **Key `y` theo ĐỜI TUYỆT ĐỐI × pitch hằng số.** Không bao giờ theo chiều cao subtree.
2. **Card box kích thước cố định + truncate tên.** Nên độ dài tên không đẩy được gì.

> Lưu ý sửa lại nhận định cũ: từ một comment FB, dự án từng ghi "lệch hàng thế hệ" là khuyết điểm phổ biến của cả ngành. **Sai** — cả hai sản phẩm chạy được đều không có lỗi này. Đó là lỗi riêng của dự án bị comment.

## 2. Ba lỗi hình học — ĐÃ SỬA

> Nguồn: `plans/reports/fullstack-260822-0157-phase1b-canvas.md`. Đóng băng thành test: `tests/tree-layout.test.ts`.

Thuật toán cũ trong `FamilyTreeCanvas.tsx` có 3 lỗi đo được (không phải phỏng đoán):

**Trùng khít toạ độ ở gia đình phổ biến nhất.** Với `mình + 2 cha mẹ + 4 ông bà`, khi không có cô dì chú bác thì `uMinX` fallback về `father.x`, làm bà nội = `fatherX+0.5` và ông ngoại = `motherX-0.5`, mà cha/mẹ cách nhau đúng 1.0 → bà nội và ông ngoại trùng khít.

**Subtree anh chị em đè nhau.** Mỗi anh/chị/em được căn giữa trên chính mình mà không reserve chiều rộng → 2 em × 4 con cho 3 vị trí trùng khít, 3/8 card bị che.

**Offset nửa cột nhỏ hơn card.** 0.5 cột = 120 px < 144 px chiều rộng card → anh chị em họ đè lên anh chị em ruột.

**Cách sửa** (`computeTreeLayout()` trong `src/lib/tree-layout.ts`, hàm thuần):
- `y` = đời tuyệt đối (BFS đa gốc từ người không có cha/mẹ ghi nhận) × pitch hằng số — đúng §1.
- `x` = đệ quy **reserve chiều rộng subtree** (post-order): lá = 1 cột, cha/mẹ = trung điểm các con. Một unit 2-cha-mẹ chỉ do MỘT cha/mẹ (id nhỏ nhất) xử lý, để tránh 2 cha/mẹ cùng tự căn theo con mà đè lại lên nhau.
- Con được nhóm theo ĐÚNG bộ cha/mẹ đã ghi (không suy diễn) — con của bà 1 và bà 2 tự tách nhóm dù chưa có `union_id` (xem §5).

Xác nhận bằng test, không phải nhìn bằng mắt: fixture `mình + 2 cha mẹ + 4 ông bà` → 0 collision trong 7 node; fixture `2 anh chị em × 4 con` → 0 collision trong 12 node (trước: 3/8 con bị che).

## 3. Kiến trúc render — gộp connector ĐÃ SỬA

> Nguồn: `plans/reports/fullstack-260822-0157-phase1b-canvas.md`.

**Cách hai sản phẩm chạy được đều làm:** card là **HTML**, đường nối là **SVG**, và cả hai dùng **chung một CSS transform giống hệt nhau** (nên pan/zoom không bao giờ lệch). Toàn bộ đoạn cha→con được nối thành **một `<path>` duy nhất**:

```
drop xuống giữa gutter  →  bus ngang  →  vertical xuống từng con
```

Canvas cũ đúng hình dạng nhưng emit một `<path>` mỗi cạnh, và đường nối vợ/chồng có hai path hình học giống hệt nhau (một "bridge" vô điều kiện + một đường riêng) khiến `EX_SPOUSE` render giống `SPOUSE`.

**Đã sửa:** `buildConnectors()` trong `src/lib/tree-layout.ts` trả về tối đa 3 `ConnectorPath` — mỗi loại (`parent-child` / `spouse` / `ex-spouse`) một `d` gộp nhiều subpath, không còn logic "bridge" riêng. `FamilyTreeCanvas.tsx` áp `strokeDasharray` riêng cho `ex-spouse` nên khác hình vẽ với `spouse` đang cưới.

## 4. Không hiển thị cả dòng họ trên một trang

Đo trên gia phả **thật** (họ Võ, 292 người, 5 đời): full view **hỏng đo được** — **231 trong ~393 cặp card liền kề cùng hàng ở gap 0** (trùng khít hoàn toàn), nhãn trống. View theo từng nhánh thì **đúng**. Canvas full: 27.657 × 1.675 px, tỉ lệ 16.5:1.

→ **Per-branch là chế độ chính.** Toàn cảnh chỉ khả thi với:
- **collapse-summary card giữ nguyên ô trong grid** (không được làm co hàng)
- **dot-LOD dưới ~25% zoom**
- và **không bao giờ ẩn một nhánh mà không nói vì sao**

Ba chế độ xem đối thủ có (toàn cảnh / tổ tiên / hậu duệ) là đúng hướng, nhưng "toàn cảnh" phải là LOD, không phải render đủ.

## 5. Đa thê — khoảng trống lớn nhất, và là bài toán layout

**Không một site nào trong 4 site render được đa thê.** Không có ví dụ sống nào để đo. Dự án duy nhất có model dùng nhãn phẳng `"Vợ thứ"` / `"Thứ thất"` — không trả lời được "con của bà nào", và backend đã chết.

**Đã cải thiện một phần, chưa xong** (nguồn: `plans/reports/fullstack-260822-0157-phase1b-canvas.md`, test `1 ông + 3 bà + 9 con` trong `tests/tree-layout.test.ts`): `computeTreeLayout()` nhóm con theo ĐÚNG bộ cha/mẹ đã ghi (không suy diễn theo hằng số `0.5` như trước) — mỗi con giờ nối về đúng cặp cha/mẹ của mình, các bà không còn lẫn con vào nhau.

**Vẫn CHƯA làm** — vì data model chưa có `union_id`/`partner_seq` (bảng `unions` là Phase 2, xem D23/D24 trong [decisions.md](decisions.md#d24)):
- các cuộc hôn nhân của cùng một người xếp theo `partner_seq`
- đoạn ngang của các union khác nhau ở **cao độ khác nhau** — hiện mọi cạnh `SPOUSE` vẫn phẳng, dùng chung cao độ, nên 3+ bà vẫn có thể chồng đoạn ngang lên nhau dù con đã tách nhóm đúng

## 6. Người đã mất: chỉ hiện năm, không marker

Đo trên gia phả thật: card người mất và người sống **giống hệt nhau về style** (Võ Quý 1957–2016 vs Võ Hòa 1976–?, byte-identical). **Năm mất là toàn bộ tín hiệu.**

Không thêm ký hiệu, không làm mờ, không gạch chéo. Lý do đầy đủ ở [culture-vietnam.md](culture-vietnam.md) §8.1.

## 7. Forest, không phải tree — ĐÃ SỬA

> Nguồn: `plans/reports/fullstack-260822-0157-phase1b-canvas.md`. Test: `tests/tree-layout.test.ts` (fixture forest 2 component rời, và fixture chu trình PARENT_OF hỏng dữ liệu).

Nhiều gốc là **bình thường** (gia phả họ Võ có 106 record ở "ĐỜI 1" — rừng ~50 gốc). `computeTreeLayout()` giờ:
- render được nhiều component rời rạc trong cùng một lần gọi — mỗi node có `componentId`
- `anchorId` chỉ ảnh hưởng **thứ tự ưu tiên** hiển thị component, không chặn tính toán — `anchorId=null` hoặc không giải được vẫn vẽ đủ mọi người
- không còn early-return "canvas rỗng" khi thiếu anchor (lỗi cũ)
- chu trình PARENT_OF do dữ liệu hỏng (thiếu FK) không làm treo: hàng đợi BFS cạn mà còn người chưa gán đời thì chốt 1 người ở đời 0 và tiếp tục

## 8. Hiệu năng

Hiện tại là `O(N·R)` cho coords + edges + labels → **~10⁶ phép so ở N=500**. Không component nào `memo()`; `cellProps` + 3 closure + object style **tạo mới mỗi lần render**. `useTreeStore()` gọi không selector ở 5 component.

Ở 1000 người (giới hạn thực tế), mục tiêu là giữ pan/zoom 60fps: tính layout một lần thành **hàm thuần**, memo theo phiên bản dữ liệu, và render card bằng danh sách phẳng.

**Đã có tiền đề đầu tiên:** `computeTreeLayout()` (`src/lib/tree-layout.ts`) giờ đúng là một hàm thuần, không import React/store/db-client (nguồn: `plans/reports/fullstack-260822-0157-phase1b-canvas.md`). Memo theo phiên bản dữ liệu, `memo()` từng component, và danh sách phẳng khi render **chưa làm** — số đo O(N·R) và các `useTreeStore()` không selector ở trên vẫn chưa được đo lại sau 1B.

## 9. Tương tác

Trạng thái hiện tại vs `.plan` đã ghi là "Added": **pan/zoom/arrow-key chưa tồn tại**. `grep onWheel|keydown|scale(|onTouch` trong `src/` → **0 hit**; canvas vẫn là `motion.div drag` của v0.4, không có `dragConstraints`.

Yêu cầu:
- **scroll-based panning** (framer drag làm mất pinch)
- zoom giữ **điểm neo cố định** khi phóng
- anchor hiện ở **360 px dưới gốc** → trên màn 390×844 nó nằm sát đáy, con cháu ra ngoài màn. Cần nút **fit/reset**
- tap vs pan phải phân biệt được (đang xung đột)

## 10. Accessibility — số đo, không phải cảm nhận

- Touch target 28 px và 20 px → **dưới ngưỡng 44 px**
- Ngôi sao anchor **focus được trong khi `opacity-0`** → bẫy focus vô hình
- Contrast `amber-400/90` trên trắng ≈ **1.7:1**; chữ `stone-400` 9 px ≈ **2.5:1** → cả hai đều fail
- SVG cây không có `aria-hidden`, nút đóng không có tên
- **Zero `prefers-reduced-motion`**
- Không safe-area inset, dùng `min-h-screen` thay vì `dvh`, không `overscroll-behavior`

Người đọc chính của gia phả là người cao tuổi — xem [culture-vietnam.md](culture-vietnam.md) §8.4. Cỡ chữ đổi được là yêu cầu, không phải tuỳ chọn phụ.

## 11. Tách file — MỘT PHẦN ĐÃ XONG

> Nguồn: `plans/reports/fullstack-260822-0157-phase1b-canvas.md`.

`FamilyTreeCanvas.tsx` từng gánh cả **tính layout + render + tương tác**. Ranh giới đã đặt ra ban đầu:

```
tree-layout.ts        tính toán thuần: (persons, unions, parentages, anchor) → coords
                      KHÔNG import React. Đây là chỗ test được.
tree-connectors.ts    coords → một chuỗi <path>
tree-viewport.tsx     pan / zoom / arrow key / fit
family-tree-canvas.tsx  ghép lại, render
```

**Hiện trạng:** `tree-layout.ts` đã tách xong và gồm luôn phần tính connector (`buildConnectors()` nằm trong cùng file, không phải file `tree-connectors.ts` riêng — path tính toán và path connector dùng chung state layout nên tách rời không có lợi). `tree-viewport.tsx` **chưa tách** — pan/zoom/arrow-key/fit chưa tồn tại (§9) nên chưa có gì để tách ra. `family-tree-canvas.tsx` (viết hoa `FamilyTreeCanvas.tsx`) vẫn ghép render + tương tác còn lại.

Lợi ích đã đạt: `tree-layout.ts` là **hàm thuần** nên các case ở §12 giờ là **test một dòng** (`tests/tree-layout.test.ts`, 8 test, PASS) thay vì phải chụp màn hình so sánh.

## 12. Fixture bắt buộc — ĐÃ ĐÓNG BĂNG THÀNH TEST

> Nguồn: `plans/reports/fullstack-260822-0157-phase1b-canvas.md`, `plans/reports/tester-260822-0157-phase0-harness.md`. Test thật: `tests/tree-layout.test.ts` + fixture ở `tests/fixtures/family-fixtures.ts`.

| Fixture | Kỳ vọng | Trạng thái |
|---|---|---|
| `mình + 2 cha mẹ + 4 ông bà` | không cặp card nào trùng toạ độ | PASS |
| `2 anh chị em × 4 con mỗi người` | không con nào bị che | PASS |
| `1 ông + 3 bà + 9 con chia theo bà` | mỗi con nối về đúng cặp của mình | PASS (đoạn ngang khác cao độ theo union — vẫn chưa làm, xem §5) |

Thêm: `anh chị em khi chưa có cha/mẹ` — KinTree đã phải **cắt bỏ** tính năng thêm anh/chị/em trực tiếp vì không xử lý được case này (*"xử lý nó không hợp lý thành ra mình bỏ cái trường hợp đó đi rồi"*). Ta có nút đó, và nó **ĐÃ SỬA**: `QuickAddForm.tsx` chặn TRƯỚC KHI ghi nếu người được chọn chưa có `PARENT_OF` nào trong `relationships` (báo lỗi i18n, không ghi ai); nếu có, nối người mới với ĐÚNG bộ cha/mẹ đó.
