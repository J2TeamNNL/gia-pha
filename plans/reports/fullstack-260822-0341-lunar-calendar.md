---
title: "Thư viện convert lịch âm ↔ dương Việt Nam — offline, 0 dependency"
date: 2026-08-22
task: "Phase 2 roadmap — lunar-calendar conversion"
files_changed: [src/lib/lunar-calendar.ts, tests/lunar-calendar.test.ts]
---

# Lunar calendar VN — báo cáo triển khai

## Thuật toán

**Hồ Ngọc Đức** (điểm Sóc + kinh độ mặt trời, công thức Meeus rút gọn, không bảng tra). Đây là thuật
toán chuẩn cho lịch âm VN — tự tính chính xác thay vì lookup table, đúng luật "0 dependency gọi mạng".
Toàn bộ port sang TS thủ công, tên hàm/biến Việt hoá, giữ nguyên công thức số học gốc. `VN_TIME_ZONE = 7`
cố định (không cấu hình — đây là điểm sống còn phân biệt lịch VN với lịch TQ ở UTC+8).

**Bug tự phát hiện, đã sửa (không có trong "bản gốc" thường được copy-paste khắp nơi):** bước fallback
gốc `if (monthStart > dayNumber) dùng k-1` chỉ sửa MỘT lần. Đo thực tế thấy **07/05/2054** và
**09/04/2062** làm `k` ước lượng ban đầu lệch nguyên 1 tháng âm (điểm Sóc rơi ~2 phút sau nửa đêm giờ VN,
sai số làm tròn) — bản gốc trả `lunarDay = 0` (ngày âm không tồn tại) một cách im lặng. Đã thay bằng
`newMoonIndexAtOrBefore()` — vòng lặp có chặn 2 chiều, dò tới khi `newMoonDay(k) <= jd < newMoonDay(k+1)`
đúng thật, áp dụng cho cả `toLunar` và `lunarMonth11`. Test `round-trip vẫn đúng khi ngày âm rơi rất gần
nửa đêm...` chốt lại 2 ca này. Round-trip toàn bộ 1901–2099 (72684 ngày) trước khi fix: 2 lỗi; sau fix: 0.

## API (`src/lib/lunar-calendar.ts`)

- `solarToLunar(year, month, day): LunarDate` — `{ year, month, day, isLeapMonth: boolean }`
- `lunarToSolar(year, month, day, isLeapMonth): SolarDate` — `{ year, month, day }`
- `getCanChi(year): CanChi` — `{ can, chi, name }`, `can=(y+6)%10`, `chi=(y+8)%12`
- `findYearsByCanChi(canChiName, fromYear, toYear): number[]` — case "cụ sinh năm Giáp Tý, không rõ số"
- `SUPPORTED_YEAR_MIN = 1900`, `SUPPORTED_YEAR_MAX = 2100` (export const)

Không import React/db/store — hàm thuần, chạy trực tiếp bằng `node --test` (`.ts` không cần build).

## Khoảng năm hỗ trợ + hành vi ngoài khoảng

`1900–2100` áp cho **năm truyền vào từng hàm cụ thể** (năm dương cho `solarToLunar`, năm âm cho
`lunarToSolar`) — throw `RangeError` tường minh nếu vượt, không bao giờ trả kết quả sai im lặng
(khớp `docs/culture-vietnam.md` §6.6). Chọn 1900–2100 vì: (a) đúng khoảng task yêu cầu test biên, (b) đã
verify round-trip **không lỗi trên toàn bộ 1901–2099** (72684/72684 ngày) + 2 năm biên 1900/2100 (trừ hiệu
ứng biên mô tả dưới) — không tìm được tài liệu chính thức nào của Hồ Ngọc Đức ghi rõ số biên chính xác
trong phiên offline này, nên chọn khoảng đã tự verify thay vì suy đoán rộng hơn.

**Hiệu ứng biên đã phát hiện và chốt bằng test riêng** (`năm dương trong khoảng hỗ trợ nhưng mùng 1
tháng 1 dương rơi vào năm âm liền trước`): ~30 ngày đầu tháng 1/1900 (trước Tết 1900) có `lunarYear =
1899`. `solarToLunar(1900, 1, 15)` **vẫn trả về đúng** (kiểm theo năm dương = 1900, hợp lệ), nhưng gọi
`lunarToSolar(1899, ...)` ngược lại của giá trị đó **throw** (kiểm theo năm âm = 1899, ngoài khoảng).
Đây là quyết định tường minh (kiểm theo năm của lịch đang convert TỪ, đối xứng đơn giản — KISS), không
phải bug: không có kết quả sai nào được trả, chỉ là round-trip qua đúng dải ~30 ngày đó không được đảm
bảo. Hiệu ứng chỉ xảy ra ở biên MIN (đầu tháng 1); biên MAX (cuối tháng 12/2100) không gặp vì Tết luôn
rơi trước tháng 12 trong năm dương đó.

`getCanChi` / `findYearsByCanChi` không giới hạn theo `SUPPORTED_YEAR_MIN/MAX` — thuần số học chu kỳ 60
năm, không cần tính điểm Sóc.

## Mốc đối chiếu — nguồn và độ tin cậy

- **Tết 2020–2026** (7 mốc): lấy từ hiểu biết chung + xác nhận qua `WebSearch` (mediamart.vn,
  margram.vn, cellphones.com.vn — tin đăng chính thức về lịch nghỉ Tết, tra 2026-08-22). **Đã tự bắt một
  lỗi**: kết quả tổng hợp đầu tiên báo Tết 2023 = 22/02/2023 nhưng ghi "rơi vào Chủ nhật" — 22/02/2023
  thực tế là thứ Tư (kiểm bằng `python3 datetime.date(2023,2,22).strftime('%A')`), còn 22/**01**/2023 mới
  đúng là Chủ nhật. Search lại với query hẹp hơn xác nhận 22/01/2023 là đúng. Đây là lỗi của bước tổng
  hợp kết quả search (không phải của nguồn gốc), tự phát hiện bằng cross-check ngày trong tuần độc lập
  với code — độ tin cậy cao vì có 2 lớp xác minh độc lập nhau.
- **Tháng nhuận 2020(t4)/2023(t2)/2025(t6)**: xác nhận qua `WebSearch`, nhiều báo VN đồng nhất
  (khoahoc.tv, vtcnews.vn, quantrimang.com, kinhtedothi.vn — đều đưa cùng thông tin "năm 2023 có 2 tháng
  2 âm"), tra 2026-08-22. Đồng thuận cao giữa nhiều nguồn độc lập.
- **2026 = Bính Ngọ**: cho sẵn trong đề bài, coi là dữ kiện gốc, không cần xác minh thêm.

## Test (`tests/lunar-calendar.test.ts`, 23 case, tất cả pass)

- Round-trip **toàn bộ** 1901–2099 (72684 ngày, không phải vài ca lẻ) + case riêng 2 ngày biên nửa đêm.
- 3 năm nhuận thật, mỗi năm còn assert **12 tháng khác trong năm đó** gọi `isLeapMonth:true` phải throw
  (invariant "tháng 4 khác tháng 4 nhuận" ở mọi tháng, không chỉ tháng đúng).
- 2 năm không nhuận (2024, 2026) yêu cầu nhuận phải throw.
- 7 mốc Tết 2020–2026.
- Biên: hằng số `SUPPORTED_YEAR_MIN/MAX`, convert được tại đúng 1900/2100, throw ngoài khoảng (1899,
  2101) ở cả hai chiều, hiệu ứng biên tháng 1/1900 mô tả trên.
- Can Chi: 2026 = Bính Ngọ, chu kỳ 60 năm quay lại đúng + 59 offset còn lại trong chu kỳ không trùng,
  `findYearsByCanChi` case Giáp Tý → `[1924, 1984, 2044]`, input sai throw.
- Input validation biên hệ thống: ngày/tháng dương và âm không hợp lệ (30/2, tháng 13, ngày 0, ngày âm
  > 30) đều throw; `getCanChi` non-integer throw.

## Verify

- `pnpm test`: 77/77 pass (23 lunar-calendar + 54 hiện có/của phase khác).
- `pnpm lint`: 0 lỗi.
- `pnpm build`: PASS.
- `npx tsc --noEmit`: sạch cho file mới.
- 0 dependency mới.

## Chưa chắc / câu hỏi mở

- Không tìm được văn bản gốc của Hồ Ngọc Đức ghi rõ khoảng năm chính xác thuật toán còn đáng tin (offline
  session, không crawl sâu). 1900–2100 là khoảng **tôi đã tự verify bằng round-trip**, không phải trích
  dẫn tài liệu — nếu cần khoảng rộng hơn (ví dụ 1800–2199 thường được đồn là giới hạn thực tế của các
  công thức Meeus rút gọn này) cần verify thêm bằng round-trip trước khi mở rộng hằng số.
- Hiệu ứng biên "~30 ngày đầu tháng 1 của SUPPORTED_YEAR_MIN thuộc lunar year ngoài khoảng" — quyết định
  hiện tại là throw khi convert ngược, ưu tiên KISS/tường minh. Nếu UI Phase 5+ cần round-trip mượt qua
  đúng dải này, sẽ cần nới `SUPPORTED_YEAR_MIN` xuống 1899 (rẻ, chỉ đổi hằng số + verify lại) — chưa làm
  vì ngoài phạm vi yêu cầu hiện tại.

Status: DONE
Summary: Cài `src/lib/lunar-calendar.ts` (thuật toán Hồ Ngọc Đức, UTC+7, 0 dependency) + 23 test; tự
phát hiện và sửa 1 bug thật của thuật toán gốc (điểm Sóc rơi gần nửa đêm làm lệch tháng); round-trip
72684 ngày 1901–2099 sạch, `pnpm test/lint/build` xanh.
Concerns/Blockers: không tìm được tài liệu chính thức xác nhận khoảng năm chính xác của thuật toán gốc
(chọn 1900–2100 dựa trên tự verify, ghi rõ trong báo cáo); hiệu ứng biên round-trip ở đầu tháng 1/1900 là
quyết định thiết kế tường minh, không phải lỗi — nêu ở mục "Chưa chắc" để review nếu cần nới khoảng.
