/**
 * Suy ra trạng thái còn sống / đã mất — HÀM THUẦN.
 *
 * Vì sao cần suy ra thay vì đọc thẳng `is_living`:
 * `is_living` là `INTEGER DEFAULT 1` và có thể **NULL**. Bản cũ đọc NULL thành
 * `false`, nên một người **không rõ** còn sống hay đã mất bị gắn dấu ✝ — app tự
 * khai tử một người mà gia đình chưa hề nói vậy. Với dữ liệu gia phả, "không
 * biết" là một câu trả lời hợp lệ và phổ biến (tổ tiên xa, người mất liên lạc).
 *
 * Xem `docs/culture-vietnam.md` — thà trả "không xác định được" còn hơn đoán.
 */
import type { Person } from "@/db/types";

export type LifeStatus = "living" | "deceased" | "unknown";

/**
 * Có bất kỳ dữ kiện mất nào được ghi không. Một dữ kiện là đủ.
 *
 * Kiểm TỪNG field độc lập, KHÔNG dùng chuỗi `a ?? b ?? c`: `??` chỉ bỏ qua
 * `null`/`undefined`, nên nó dừng lại ở một `""` hoặc `0` và **bỏ mất** các field
 * phía sau. `{ death_lunar: "", burial_location: "Nghĩa trang họ Nguyễn" }` từng
 * bị đọc thành "không có dữ kiện mất" vì lý do đó.
 *
 * `0` và `""` coi như KHÔNG có dữ kiện: không có năm/tháng/ngày 0, và chuỗi rỗng
 * là ô để trống. Chúng không đủ để khai tử một người.
 */
function hasDeathFact(person: Partial<Person>): boolean {
  const numbers = [person.death_year, person.death_month, person.death_day];
  const texts = [person.death_lunar, person.burial_location];
  return (
    numbers.some((n) => typeof n === "number" && n !== 0) ||
    texts.some((t) => typeof t === "string" && t.trim() !== "")
  );
}

/**
 * Thứ tự ưu tiên:
 * 1. Có dữ kiện mất (năm/tháng/ngày/ngày âm/nơi an táng) ⇒ `deceased`, kể cả khi
 *    `is_living` còn sót giá trị cũ — dữ kiện cụ thể thắng một cờ boolean.
 * 2. `is_living` có giá trị tường minh ⇒ theo nó.
 * 3. Còn lại ⇒ `unknown`. KHÔNG đoán.
 */
export function lifeStatus(person: Partial<Person>): LifeStatus {
  if (hasDeathFact(person)) return "deceased";
  if (person.is_living === true) return "living";
  if (person.is_living === false) return "deceased";
  return "unknown";
}

/** Chỉ `true` khi CHẮC CHẮN đã mất. `unknown` không bao giờ hiện dấu ✝. */
export function isDeceased(person: Partial<Person>): boolean {
  return lifeStatus(person) === "deceased";
}
