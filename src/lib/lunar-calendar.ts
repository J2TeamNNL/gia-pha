/**
 * Chuyển đổi lịch âm ↔ dương lịch Việt Nam — HÀM THUẦN, offline, 0 dependency.
 *
 * Thuật toán: **Hồ Ngọc Đức** — tính trực tiếp điểm Sóc (New Moon) và kinh độ
 * mặt trời bằng công thức thiên văn rút gọn (Meeus), KHÔNG dùng bảng tra sẵn.
 * Đây là thuật toán chuẩn cho lịch âm Việt Nam, được tái hiện lại ở đây với
 * tên hàm/biến tiếng Việt hoá cho dễ đọc; công thức số học giữ đúng bản gốc.
 *
 * MÚI GIỜ LÀ ĐIỂM SỐNG CÒN: lịch âm Việt Nam quy điểm Sóc về nửa đêm theo
 * **UTC+7** (giờ Hà Nội); lịch Trung Quốc dùng UTC+8. Vênh 1 giờ này có thể
 * đẩy điểm Sóc qua/lại lúc nửa đêm, làm lệch nguyên một ngày/tháng âm — đây là
 * lý do một số năm Tết Việt Nam lệch Tết Trung Quốc 1 ngày. `VN_TIME_ZONE`
 * dưới đây cố định = 7, không cấu hình được (không phải bug, là chủ đích).
 *
 * Xem `docs/culture-vietnam.md` §6 cho luật domain: lưu đúng lịch gia đình
 * khai, `is_leap_month` bắt buộc, ngoài khoảng năm hỗ trợ phải báo rõ chứ
 * không đoán.
 */

/** Năm dương lịch nhỏ nhất được đảm bảo chính xác — xem báo cáo triển khai. */
export const SUPPORTED_YEAR_MIN = 1900;
/** Năm dương lịch lớn nhất được đảm bảo chính xác — xem báo cáo triển khai. */
export const SUPPORTED_YEAR_MAX = 2100;

/** Múi giờ Việt Nam dùng để quy điểm Sóc về nửa đêm địa phương. */
const VN_TIME_ZONE = 7;

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  /** Tháng nhuận — bắt buộc, không được rơi mất ở bất kỳ chiều convert nào. */
  isLeapMonth: boolean;
}

export interface SolarDate {
  year: number;
  month: number;
  day: number;
}

export interface CanChi {
  /** Can, ví dụ "Bính". */
  can: string;
  /** Chi, ví dụ "Ngọ". */
  chi: string;
  /** Tên đầy đủ, ví dụ "Bính Ngọ". */
  name: string;
}

const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
const CHI = [
  "Tý",
  "Sửu",
  "Dần",
  "Mão",
  "Thìn",
  "Tỵ",
  "Ngọ",
  "Mùi",
  "Thân",
  "Dậu",
  "Tuất",
  "Hợi",
];

/** Modulo luôn dương, dùng cho công thức Can Chi ((year+6) mod 10 v.v.). */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

// ---------------------------------------------------------------------------
// Số học Julian Day (Meeus / thuật toán Hồ Ngọc Đức) — nội bộ, không export.
// ---------------------------------------------------------------------------

function floorDiv(a: number, b: number): number {
  return Math.floor(a / b);
}

/** Ngày dương (dd/mm/yy) → Julian Day Number nguyên (lịch Gregorian). */
function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = floorDiv(14 - mm, 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd =
    dd +
    floorDiv(153 * m + 2, 5) +
    365 * y +
    floorDiv(y, 4) -
    floorDiv(y, 100) +
    floorDiv(y, 400) -
    32045;
  if (jd < 2299161) {
    // Trước 15/10/1582 (lịch Julian). Không xảy ra trong khoảng năm được hỗ
    // trợ (>= 1900) — giữ nhánh này để công thức đúng về mặt thiên văn.
    jd = dd + floorDiv(153 * m + 2, 5) + 365 * y + floorDiv(y, 4) - 32083;
  }
  return jd;
}

/** Julian Day Number nguyên → ngày dương [day, month, year]. */
function jdToDate(jd: number): [number, number, number] {
  let a: number;
  let b: number;
  let c: number;
  if (jd > 2299160) {
    a = jd + 32044;
    b = floorDiv(4 * a + 3, 146097);
    c = a - floorDiv(b * 146097, 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = floorDiv(4 * c + 3, 1461);
  const e = c - floorDiv(1461 * d, 4);
  const m = floorDiv(5 * e + 2, 153);
  const day = e - floorDiv(153 * m + 2, 5) + 1;
  const month = m + 3 - 12 * floorDiv(m, 10);
  const year = b * 100 + d - 4800 + floorDiv(m, 10);
  return [day, month, year];
}

/** Thời điểm Sóc (New Moon) thứ k kể từ mốc 1900, dạng Julian Day (giờ UTC). */
function newMoon(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;

  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);

  const m = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3; // dị thường mặt trời
  const mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3; // dị thường mặt trăng
  const f = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3; // vĩ độ mặt trăng

  const c1 =
    (0.1734 - 0.000393 * T) * Math.sin(m * dr) +
    0.0021 * Math.sin(2 * dr * m) -
    0.4068 * Math.sin(mpr * dr) +
    0.0161 * Math.sin(2 * dr * mpr) -
    0.0004 * Math.sin(3 * dr * mpr) +
    0.0104 * Math.sin(2 * dr * f) -
    0.0051 * Math.sin(dr * (m + mpr)) -
    0.0074 * Math.sin(dr * (m - mpr)) +
    0.0004 * Math.sin(dr * (2 * f + m)) -
    0.0004 * Math.sin(dr * (2 * f - m)) -
    0.0006 * Math.sin(dr * (2 * f + mpr)) +
    0.001 * Math.sin(dr * (2 * f - mpr)) +
    0.0005 * Math.sin(dr * (2 * mpr + m));

  let deltaT: number;
  if (T < -11) {
    deltaT = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
  } else {
    deltaT = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }

  return jd1 + c1 - deltaT;
}

/** Kinh độ mặt trời thật (radian, chuẩn hoá 0..2π) tại thời điểm Julian Day jdn. */
function sunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const m = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const l0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let dl = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * m);
  dl += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * m) + 0.00029 * Math.sin(dr * 3 * m);
  let l = (l0 + dl) * dr;
  l -= Math.PI * 2 * Math.floor(l / (Math.PI * 2));
  return l;
}

/** Cung hoàng đạo (0..11) chứa mặt trời vào nửa đêm địa phương của ngày jdn. */
function sunLongitudeSector(jdn: number, timeZone: number): number {
  return Math.floor((sunLongitude(jdn - 0.5 - timeZone / 24) / Math.PI) * 6);
}

/** JDN (theo giờ địa phương timeZone) của điểm Sóc thứ k. */
function newMoonDay(k: number, timeZone: number): number {
  return Math.floor(newMoon(k) + 0.5 + timeZone / 24);
}

/**
 * Chỉ số k của điểm Sóc LỚN NHẤT còn <= `ceilingJd`, dò lại quanh ước lượng
 * `estimateK` bằng vòng lặp có chặn hai chiều.
 *
 * Vì sao cần: công thức ước lượng ban đầu `k = floor((jd - epoch) / 29.53...)`
 * đôi khi lệch nguyên 1 tháng âm khi điểm Sóc thật rơi rất gần nửa đêm địa
 * phương (sai số làm tròn của công thức thiên văn). Thuật toán gốc chỉ sửa
 * một lần (`if quá thì lùi 1`), không đủ — đã đo được lệch thật ở 07/05/2054
 * và 09/04/2062 trong khoảng năm hỗ trợ. `newMoonDay` đơn điệu tăng theo k
 * nên vòng lặp này luôn hội tụ trong vài bước và không thể chạy vô hạn.
 */
function newMoonIndexAtOrBefore(estimateK: number, ceilingJd: number, timeZone: number): number {
  let k = estimateK;
  while (newMoonDay(k, timeZone) > ceilingJd) {
    k -= 1;
  }
  while (newMoonDay(k + 1, timeZone) <= ceilingJd) {
    k += 1;
  }
  return k;
}

/** JDN ngày bắt đầu tháng 11 âm lịch (chứa/ngay trước Đông chí) của năm dương yy. */
function lunarMonth11(yy: number, timeZone: number): number {
  const ceilingJd = jdFromDate(31, 12, yy);
  const estimateK = Math.floor((ceilingJd - 2415021) / 29.530588853);
  const k = newMoonIndexAtOrBefore(estimateK, ceilingJd, timeZone);
  let nm = newMoonDay(k, timeZone);
  if (sunLongitudeSector(nm, timeZone) >= 9) {
    // Sóc này đã ở sau Đông chí — đây là tháng 12, lùi một tháng để lấy tháng 11.
    nm = newMoonDay(k - 1, timeZone);
  }
  return nm;
}

/** Trong năm nhuận (13 tháng âm), độ lệch tháng nhuận tính từ tháng 11 năm trước. */
function leapMonthOffset(a11: number, timeZone: number): number {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let i = 1;
  let arc = sunLongitudeSector(newMoonDay(k + i, timeZone), timeZone);
  let last: number;
  do {
    last = arc;
    i += 1;
    arc = sunLongitudeSector(newMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

/** Lõi thuật toán: ngày dương (dd/mm/yy) → ngày âm. */
function toLunar(dd: number, mm: number, yy: number, timeZone: number): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const estimateK = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  const monthStart = newMoonDay(
    newMoonIndexAtOrBefore(estimateK, dayNumber, timeZone),
    timeZone,
  );
  let a11 = lunarMonth11(yy, timeZone);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = lunarMonth11(yy - 1, timeZone);
  } else {
    lunarYear = yy + 1;
    b11 = lunarMonth11(yy + 1, timeZone);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarLeap = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapDiff = leapMonthOffset(a11, timeZone);
    if (diff >= leapDiff) {
      lunarMonth = diff + 10;
      if (diff === leapDiff) {
        lunarLeap = true;
      }
    }
  }
  if (lunarMonth > 12) {
    lunarMonth -= 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }
  return { year: lunarYear, month: lunarMonth, day: lunarDay, isLeapMonth: lunarLeap };
}

/** Lõi thuật toán: ngày âm → ngày dương. Throw nếu `isLeapMonth` không khớp thực tế. */
function toSolar(
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
  lunarLeap: boolean,
  timeZone: number,
): SolarDate {
  let a11: number;
  let b11: number;
  if (lunarMonth < 11) {
    a11 = lunarMonth11(lunarYear - 1, timeZone);
    b11 = lunarMonth11(lunarYear, timeZone);
  } else {
    a11 = lunarMonth11(lunarYear, timeZone);
    b11 = lunarMonth11(lunarYear + 1, timeZone);
  }
  let off = lunarMonth - 11;
  if (off < 0) {
    off += 12;
  }
  const hasLeapMonthThisYear = b11 - a11 > 365;
  if (hasLeapMonthThisYear) {
    const leapOff = leapMonthOffset(a11, timeZone);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) {
      leapMonth += 12;
    }
    if (lunarLeap && lunarMonth !== leapMonth) {
      // Thuật toán gốc trả sentinel [0,0,0] ở đây — im lặng sai. Ta throw để
      // không bao giờ trả một ngày dương bịa ra (luật domain §6.6).
      throw new Error(
        `Năm âm ${lunarYear} không có tháng ${lunarMonth} nhuận (tháng nhuận thật của năm ` +
          `này là tháng ${leapMonth}).`,
      );
    }
    if (lunarLeap || off >= leapOff) {
      off += 1;
    }
  } else if (lunarLeap) {
    throw new Error(`Năm âm ${lunarYear} không có tháng nhuận.`);
  }
  const k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  const monthStart = newMoonDay(k + off, timeZone);
  const [day, month, year] = jdToDate(monthStart + lunarDay - 1);
  return { year, month, day };
}

// ---------------------------------------------------------------------------
// Validate đầu vào — biên hệ thống, không tin dữ liệu gọi vào.
// ---------------------------------------------------------------------------

function assertSupportedYear(year: number): void {
  if (year < SUPPORTED_YEAR_MIN || year > SUPPORTED_YEAR_MAX) {
    throw new RangeError(
      `Năm ${year} ngoài khoảng được thuật toán hỗ trợ ` +
        `(${SUPPORTED_YEAR_MIN}–${SUPPORTED_YEAR_MAX}). Không chuyển đổi được — ` +
        "không suy đoán kết quả sai.",
    );
  }
}

function assertValidSolarDate(year: number, month: number, day: number): void {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new TypeError("Ngày dương lịch phải là số nguyên.");
  }
  if (month < 1 || month > 12) {
    throw new RangeError(`Tháng dương lịch không hợp lệ: ${month}.`);
  }
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    throw new RangeError(`Ngày dương lịch không hợp lệ: ${day}/${month}/${year}.`);
  }
}

function assertValidLunarDate(year: number, month: number, day: number): void {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new TypeError("Ngày âm lịch phải là số nguyên.");
  }
  if (month < 1 || month > 12) {
    throw new RangeError(`Tháng âm lịch không hợp lệ: ${month}.`);
  }
  // Tháng âm tối đa 30 ngày (đúng invariant CHECK của date_facts.day <= 30).
  if (day < 1 || day > 30) {
    throw new RangeError(`Ngày âm lịch không hợp lệ: ${day}.`);
  }
}

// ---------------------------------------------------------------------------
// API công khai
// ---------------------------------------------------------------------------

/**
 * Dương → âm (lịch Việt Nam, UTC+7).
 *
 * Throw `RangeError` nếu `year` ngoài [`SUPPORTED_YEAR_MIN`, `SUPPORTED_YEAR_MAX`],
 * hoặc nếu ngày dương không hợp lệ (ví dụ 30/2). Không bao giờ trả kết quả sai
 * một cách im lặng.
 */
export function solarToLunar(year: number, month: number, day: number): LunarDate {
  assertValidSolarDate(year, month, day);
  assertSupportedYear(year);
  return toLunar(day, month, year, VN_TIME_ZONE);
}

/**
 * Âm → dương (lịch Việt Nam, UTC+7). `isLeapMonth` bắt buộc truyền vào — tháng
 * 4 và tháng 4 nhuận là hai ngày khác nhau, không có giá trị mặc định an toàn.
 *
 * Throw `RangeError` nếu `year` ngoài khoảng hỗ trợ hoặc ngày âm không hợp lệ.
 * Throw `Error` nếu `isLeapMonth = true` nhưng năm đó không có tháng nhuận đó
 * (không bịa ra một ngày dương cho một tháng nhuận không tồn tại).
 */
export function lunarToSolar(
  year: number,
  month: number,
  day: number,
  isLeapMonth: boolean,
): SolarDate {
  assertValidLunarDate(year, month, day);
  assertSupportedYear(year);
  return toSolar(year, month, day, isLeapMonth, VN_TIME_ZONE);
}

/**
 * Can Chi của một năm âm lịch. `year` là số năm âm (thường trùng số năm
 * dương mà Tết năm đó rơi vào — cách người Việt vẫn nói "sinh năm Giáp Tý").
 * Công thức thuần, không giới hạn theo `SUPPORTED_YEAR_MIN/MAX` (không cần
 * tính điểm Sóc).
 */
export function getCanChi(year: number): CanChi {
  if (!Number.isInteger(year)) {
    throw new TypeError("Năm âm lịch phải là số nguyên.");
  }
  const can = CAN[mod(year + 6, 10)];
  const chi = CHI[mod(year + 8, 12)];
  return { can, chi, name: `${can} ${chi}` };
}

/**
 * Tất cả các năm trong [`fromYear`, `toYear`] (bao gồm hai đầu) có tên Can Chi
 * khớp `canChiName` (ví dụ `"Giáp Tý"`). Dùng cho case "cụ sinh năm Giáp Tý,
 * không rõ số" — để UI cho người dùng chọn giữa các năm khớp (cách nhau 60
 * năm/lần).
 *
 * Throw `Error` nếu `canChiName` không parse được thành một Can + một Chi hợp
 * lệ, hoặc `RangeError` nếu `fromYear > toYear`.
 */
export function findYearsByCanChi(
  canChiName: string,
  fromYear: number,
  toYear: number,
): number[] {
  if (!Number.isInteger(fromYear) || !Number.isInteger(toYear)) {
    throw new TypeError("Khoảng năm tra cứu phải là số nguyên.");
  }
  if (fromYear > toYear) {
    throw new RangeError(`Khoảng năm không hợp lệ: từ ${fromYear} tới ${toYear}.`);
  }
  const parts = canChiName.trim().split(/\s+/);
  if (parts.length !== 2) {
    throw new Error(`Tên Can Chi không hợp lệ: "${canChiName}". Ví dụ hợp lệ: "Giáp Tý".`);
  }
  const [canName, chiName] = parts;
  const canIndex = CAN.indexOf(canName);
  const chiIndex = CHI.indexOf(chiName);
  if (canIndex === -1 || chiIndex === -1) {
    throw new Error(`Tên Can Chi không hợp lệ: "${canChiName}".`);
  }
  const years: number[] = [];
  for (let year = fromYear; year <= toYear; year += 1) {
    if (mod(year + 6, 10) === canIndex && mod(year + 8, 12) === chiIndex) {
      years.push(year);
    }
  }
  return years;
}
