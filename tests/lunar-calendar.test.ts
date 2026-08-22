/**
 * Test cho `src/lib/lunar-calendar.ts`.
 *
 * Mốc đối chiếu dùng trong file này:
 * - Ngày Tết (mùng 1 tháng 1 âm) 2020–2026: kiểm tra kép — (a) khớp thứ trong
 *   tuần tính bằng `Date` chuẩn ISO (không phụ thuộc code đang test), (b) khớp
 *   nguồn công khai đã tra cứu 2026-08-22 (mediamart.vn, margram.vn,
 *   cellphones.com.vn — các trang tin tức VN đưa tin lịch nghỉ Tết chính thức).
 *   Đã tự phát hiện và loại một mốc sai do tool search tổng hợp lẫn tháng
 *   (báo "22/02/2023" nhưng ngày đó là thứ Tư, không phải Chủ nhật như mô tả;
 *   ngày đúng có thứ khớp là 22/01/2023) — xem báo cáo triển khai.
 * - Tháng nhuận 2020/2023/2025: tra chéo nhiều báo VN (khoahoc.tv, vtcnews.vn,
 *   quantrimang.com, kinhtedothi.vn) đều đồng nhất tháng nhuận, tra 2026-08-22.
 * - Can Chi 2026 = Bính Ngọ: cho sẵn trong đề bài, coi là dữ kiện gốc.
 *
 * Nếu một mốc kỳ vọng lệch với code, KHÔNG sửa test cho khớp code — điều tra
 * (đã làm với vụ 2054-05-07 / 2062-04-09, xem comment `newMoonIndexAtOrBefore`
 * trong file nguồn) rồi báo cáo trung thực.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  solarToLunar,
  lunarToSolar,
  getCanChi,
  findYearsByCanChi,
  SUPPORTED_YEAR_MIN,
  SUPPORTED_YEAR_MAX,
} from "../src/lib/lunar-calendar.ts";

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ---------------------------------------------------------------------------
// Round-trip: dương → âm → dương phải về đúng ngày gốc.
// ---------------------------------------------------------------------------

test("round-trip mọi ngày 1901-2099 (nội suy đầy đủ, không chỉ vài ca lẻ)", () => {
  let checked = 0;
  for (let year = 1901; year <= 2099; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const dim = daysInMonth(year, month);
      for (let day = 1; day <= dim; day += 1) {
        const lunar = solarToLunar(year, month, day);
        const back = lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.isLeapMonth);
        assert.deepEqual(
          back,
          { year, month, day },
          `round-trip lệch ở ${year}-${month}-${day} (âm: ${JSON.stringify(lunar)})`,
        );
        checked += 1;
      }
    }
  }
  // 1901-2099 là 199 năm, ~72700 ngày — chốt số lượng để không âm thầm chạy ít hơn.
  assert.ok(checked > 72000, `chỉ kiểm ${checked} ngày, ít hơn kỳ vọng`);
});

test("round-trip vẫn đúng khi ngày âm rơi rất gần nửa đêm điểm Sóc (07/05/2054, 09/04/2062)", () => {
  // Hai ca thật đã đo được: ước lượng k ban đầu lệch 1 tháng âm vì điểm Sóc
  // rơi chỉ ~2 phút sau nửa đêm giờ VN. Chốt lại rõ ràng để không hồi quy.
  for (const [y, m, d] of [
    [2054, 5, 7],
    [2062, 4, 9],
  ] as const) {
    const lunar = solarToLunar(y, m, d);
    assert.notEqual(lunar.day, 0, `${y}-${m}-${d} phải không sinh ra ngày âm = 0`);
    const back = lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.isLeapMonth);
    assert.deepEqual(back, { year: y, month: m, day: d });
  }
});

// ---------------------------------------------------------------------------
// Tháng nhuận thật.
// ---------------------------------------------------------------------------

test("tháng nhuận thật — 3 năm âm có tháng nhuận đã biết công khai", () => {
  const knownLeapMonths: Array<[lunarYear: number, leapMonth: number]> = [
    [2020, 4],
    [2023, 2],
    [2025, 6],
  ];
  for (const [lunarYear, leapMonth] of knownLeapMonths) {
    // Tháng nhuận đúng phải convert được ngược ra ngày dương.
    const solar = lunarToSolar(lunarYear, leapMonth, 1, true);
    assert.equal(solarToLunar(solar.year, solar.month, solar.day).month, leapMonth);
    assert.equal(solarToLunar(solar.year, solar.month, solar.day).isLeapMonth, true);

    // Mọi tháng khác trong năm đó KHÔNG được là tháng nhuận — is_leap_month
    // phải phân biệt rõ "tháng 4" và "tháng 4 nhuận" (luật domain §6.3).
    for (let month = 1; month <= 12; month += 1) {
      if (month === leapMonth) continue;
      assert.throws(
        () => lunarToSolar(lunarYear, month, 1, true),
        `năm ${lunarYear} tháng ${month} không phải tháng nhuận, phải throw`,
      );
    }
  }
});

test("năm không có tháng nhuận: yêu cầu isLeapMonth=true phải throw, không đoán", () => {
  // 2024 và 2026 không có tháng nhuận (suy từ việc 2023 và 2025 đã có).
  for (const year of [2024, 2026]) {
    assert.throws(() => lunarToSolar(year, 3, 1, true));
  }
});

// ---------------------------------------------------------------------------
// Ngày Tết — mùng 1 tháng 1 âm của vài năm liên tiếp.
// ---------------------------------------------------------------------------

test("mùng 1 Tết khớp ngày dương đã biết công khai, 2020-2026", () => {
  const tetDates: Array<[solarYear: number, solarMonth: number, solarDay: number]> = [
    [2020, 1, 25],
    [2021, 2, 12],
    [2022, 2, 1],
    [2023, 1, 22],
    [2024, 2, 10],
    [2025, 1, 29],
    [2026, 2, 17],
  ];
  for (const [y, m, d] of tetDates) {
    const lunar = solarToLunar(y, m, d);
    assert.equal(lunar.month, 1, `Tết ${y} phải là tháng 1 âm`);
    assert.equal(lunar.day, 1, `Tết ${y} phải là ngày 1 âm`);
    assert.equal(lunar.isLeapMonth, false);
  }
});

// ---------------------------------------------------------------------------
// Năm biên: quanh SUPPORTED_YEAR_MIN/MAX.
// ---------------------------------------------------------------------------

test(`khoảng năm hỗ trợ là [${SUPPORTED_YEAR_MIN}, ${SUPPORTED_YEAR_MAX}]`, () => {
  assert.equal(SUPPORTED_YEAR_MIN, 1900);
  assert.equal(SUPPORTED_YEAR_MAX, 2100);
});

test("năm dương trong khoảng biên (1900, 2100) convert được", () => {
  assert.deepEqual(solarToLunar(1900, 3, 1), { year: 1900, month: 2, day: 1, isLeapMonth: false });
  assert.deepEqual(solarToLunar(2100, 6, 15), {
    year: 2100,
    month: 5,
    day: 8,
    isLeapMonth: false,
  });
});

test("ngoài khoảng năm hỗ trợ: throw RangeError, KHÔNG trả kết quả sai im lặng", () => {
  assert.throws(() => solarToLunar(1899, 12, 31), RangeError);
  assert.throws(() => solarToLunar(2101, 1, 1), RangeError);
  assert.throws(() => lunarToSolar(1899, 12, 1, false), RangeError);
  assert.throws(() => lunarToSolar(2101, 1, 1, false), RangeError);
});

test("năm dương trong khoảng hỗ trợ nhưng mùng 1 tháng 1 dương rơi vào năm âm liền trước", () => {
  // Tết chưa tới nên đầu tháng 1 dương của 1900 thuộc lunar year 1899 — bản
  // thân solarToLunar(1900,...) vẫn hợp lệ (kiểm theo năm dương = 1900), dù
  // giá trị lunar year trả về (1899) nằm ngoài khoảng hỗ trợ chính thức.
  const lunar = solarToLunar(1900, 1, 15);
  assert.equal(lunar.year, 1899);
  // Nhưng convert NGƯỢC giá trị đó lại throw, vì lunarToSolar kiểm theo năm
  // âm truyền vào (1899 < SUPPORTED_YEAR_MIN). Quyết định tường minh, không
  // phải bug: round-trip không được đảm bảo khi bắc cầu qua ranh giới năm hỗ
  // trợ theo lịch khác loại.
  assert.throws(() => lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.isLeapMonth), RangeError);
});

// ---------------------------------------------------------------------------
// Can Chi.
// ---------------------------------------------------------------------------

test("2026 là năm Bính Ngọ", () => {
  assert.deepEqual(getCanChi(2026), { can: "Bính", chi: "Ngọ", name: "Bính Ngọ" });
});

test("chu kỳ Can Chi quay lại đúng sau 60 năm", () => {
  const base = getCanChi(2026);
  assert.deepEqual(getCanChi(2026 - 60), base);
  assert.deepEqual(getCanChi(2026 + 60), base);
  assert.deepEqual(getCanChi(2026 + 120), base);
  // Trong một chu kỳ 60 năm, không năm nào khác trùng tên.
  for (let offset = 1; offset < 60; offset += 1) {
    assert.notDeepEqual(getCanChi(2026 + offset), base);
  }
});

test("findYearsByCanChi: case thật — 'cụ sinh năm Giáp Tý, không rõ số'", () => {
  const years = findYearsByCanChi("Giáp Tý", 1900, 2100);
  assert.deepEqual(years, [1924, 1984, 2044]);
  for (const y of years) {
    assert.deepEqual(getCanChi(y), { can: "Giáp", chi: "Tý", name: "Giáp Tý" });
  }
});

test("findYearsByCanChi: đầu vào không hợp lệ throw rõ ràng", () => {
  assert.throws(() => findYearsByCanChi("Không Tồn Tại", 1900, 2000));
  assert.throws(() => findYearsByCanChi("Giáp", 1900, 2000));
  assert.throws(() => findYearsByCanChi("Giáp Tý", 2000, 1900));
});

// ---------------------------------------------------------------------------
// Input validation ở biên hệ thống.
// ---------------------------------------------------------------------------

test("solarToLunar: ngày dương không hợp lệ throw", () => {
  assert.throws(() => solarToLunar(2023, 2, 30)); // tháng 2/2023 không có ngày 30
  assert.throws(() => solarToLunar(2023, 13, 1));
  assert.throws(() => solarToLunar(2023, 1, 0));
});

test("lunarToSolar: ngày âm không hợp lệ throw", () => {
  assert.throws(() => lunarToSolar(2023, 13, 1, false));
  assert.throws(() => lunarToSolar(2023, 1, 31, false)); // tháng âm tối đa 30 ngày
  assert.throws(() => lunarToSolar(2023, 1, 0, false));
});

test("getCanChi: đầu vào không phải số nguyên throw", () => {
  assert.throws(() => getCanChi(2026.5));
});
