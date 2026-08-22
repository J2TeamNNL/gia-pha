# Ghi nhận nguồn

Ai/cái gì đã đóng góp vào dự án này, và **đóng góp theo kiểu nào**. Ba kiểu rất khác nhau về nghĩa vụ pháp lý:

| Kiểu | Nghĩa vụ |
|---|---|
| **Đã lấy vào code** | phải ghi nguồn, phải tuân license |
| **Chỉ đọc để học hành vi** | không lấy dòng code nào; không có nghĩa vụ license, nhưng vẫn ghi nguồn cho minh bạch |
| **Bằng chứng từ người thật** | không tái công bố dữ liệu cá nhân |

---

## 1. Đã lấy vào code

### Thuật toán âm lịch Việt Nam — Hồ Ngọc Đức

`src/lib/lunar-calendar.ts` cài thuật toán lịch âm Việt Nam của **Hồ Ngọc Đức**: tính trực tiếp
điểm Sóc (New Moon) và kinh độ mặt trời, không dùng bảng tra sẵn. Tên hàm/biến được Việt hoá cho dễ
đọc, nhưng **công thức số học giữ đúng bản gốc** — nên đây là tác phẩm phái sinh, không phải cài lại
độc lập.

Nền toán học bên dưới: **Jean Meeus**, *Astronomical Algorithms* (Willmann-Bell) — bản rút gọn của
các công thức thiên văn trong sách.

Múi giờ UTC+7 (điểm Sóc quy về nửa đêm Hà Nội) là chi tiết làm nên lịch âm **Việt Nam**, phân biệt với
lịch Trung Quốc dùng UTC+8. Xem `src/lib/lunar-calendar.ts` phần đầu file.

> ⚠️ **Chưa xác minh license.** Báo cáo triển khai
> [`fullstack-260822-0341-lunar-calendar.md`](../plans/reports/fullstack-260822-0341-lunar-calendar.md)
> ghi rõ: không tìm được văn bản gốc nào của Hồ Ngọc Đức nêu điều kiện sử dụng, kể cả khoảng năm mà
> thuật toán còn đáng tin. **Phải xác minh điều kiện sử dụng trước khi phát hành công khai.** Nếu
> license không cho phép, hai đường: xin phép tác giả, hoặc cài lại từ Meeus (nguồn sách) mà không
> tham chiếu bản của ông.

### shadcn/ui

`src/components/ui/` — 6 component (`button`, `card`, `dialog`, `form`, `input`, `label`) theo
**shadcn/ui**, giấy phép **MIT**. Mô hình của shadcn là copy code vào dự án chứ không cài như thư viện,
nên các file này thuộc repo và đã được sửa theo nhu cầu. Bản gốc: shadcn/ui.

### Dependency runtime

License đi kèm từng package trong `node_modules`; danh sách khai trong `package.json`:

`@sqlite.org/sqlite-wasm` (SQLite — public domain, wrapper của nhóm SQLite) ·
`react`, `react-dom` · `radix-ui` · `lucide-react` (icon) · `zustand` · `zod` ·
`react-hook-form`, `@hookform/resolvers` · `date-fns` · `framer-motion` ·
`class-variance-authority`, `clsx`, `tailwind-merge`

Build/test: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `typescript`, `eslint`, `vitest`,
`@playwright/test`.

---

## 2. Chỉ đọc để học hành vi — KHÔNG lấy code

Bốn sản phẩm gia phả Việt Nam đã được khảo sát để hiểu cái gì đã làm đúng và cái gì làm sai.
**Không dòng code nào được copy từ những nguồn này.** Bằng chứng nằm trong `plans/reports/`.

| Sản phẩm | Nguồn | Bản đã đọc | License |
|---|---|---|---|
| **KinTree** | app Android `dev.creaton.kintree` | v1.0.5, đo trên máy 2026-08-22 | app thương mại, có tầng Premium |
| **AncestorTree** | `github.com/Minh-Tam-Solution/AncestorTree` | `1e788ac` (2026-02-28) | **không có file LICENSE** |
| **Gia Phả Điện Tử** | `github.com/0xAstroAlpha/Gia-Pha-Dien-Tu` | `e30be23` (2026-02-22) | **không có file LICENSE** |
| **giapha-os** | `github.com/homielab/giapha-os` | `174a7d6` (2026-02-28) | **không có file LICENSE** |

> ⚠️ **Ba repo trên không có license ⇒ mặc định tác giả giữ TOÀN QUYỀN.** Được đọc để học, **không**
> được copy code, kể cả một hàm. Ba bản clone nằm ở `references/` và **bị gitignore** — chúng không
> bao giờ vào lịch sử repo này. Ai clone lại thì tự clone, đừng commit vào đây.

## 3. Bằng chứng từ người thật

Luật domain trong [`culture-vietnam.md`](culture-vietnam.md) không phải do suy đoán — nó đến từ:

- **~700 comment thật** của người dùng trên 5 bài đăng Facebook về 5 dự án gia phả Việt Nam.
  Tổng hợp trong `plans/reports/fb-research/`.
- **Một gia phả thật của họ Võ (Quảng Ngãi), 292 người**, đo trực tiếp trên bản web công khai của họ.
  Đây là nguồn của những phát hiện đắt nhất — ví dụ record `Bà Võ Văn Mượng`, người vợ được ghi **chỉ
  bằng tên chồng**, thứ chứng minh vì sao ba phần của tên không được `NOT NULL` cả ba.

> Các report **tổng hợp phát hiện**, không tái công bố dữ liệu cá nhân của ai. Giữ nguyên nguyên tắc
> đó khi viết report mới: dẫn được cấu trúc và hành vi, đừng sao lại danh tính và liên hệ của người thật.

## 4. Dữ liệu do dự án tự soạn

Không phải mọi thứ giống dữ liệu đều là dữ liệu đi mượn:

- `src/kinship/dictionaries/` (`bac`, `trung`, `nam`, `quang-tri`) — bảng xưng hô theo phương ngữ,
  **do dự án tự mã hoá** từ luật trong `culture-vietnam.md` §5, không copy từ đâu.
- Icon trong `public/icons/`, `public/manifest.webmanifest`, `public/sw.js` — của dự án.

---

## Câu chưa trả lời được

1. **Điều kiện sử dụng thuật toán Hồ Ngọc Đức** — chặn việc phát hành công khai. Mục 1 nêu hai đường xử lý.
2. `src/app/favicon.ico` còn sót từ scaffold Next.js, `index.html` không tham chiếu tới. Xoá được nhưng chưa xoá.
3. Chưa rà soát xem `references/` có từng bị copy đoạn nào sang `src/` trong quá khứ hay không —
   hiện trạng thì `src/` là code của dự án, nhưng chưa có lần kiểm đối chiếu tường minh nào.
