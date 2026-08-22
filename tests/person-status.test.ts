/**
 * `lifeStatus()` — ba trạng thái, không hai.
 *
 * Bug gốc: `is_living` là `INTEGER DEFAULT 1` và có thể NULL; tầng đọc cũ map
 * NULL → `false`, nên một người KHÔNG RÕ trạng thái bị gắn dấu ✝ — app tự khai
 * tử người mà gia đình chưa hề nói vậy. Với gia phả, "không biết" là câu trả lời
 * hợp lệ và phổ biến (tổ tiên xa, người mất liên lạc).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { lifeStatus, isDeceased } from "../src/lib/person-status.ts";

test("không có dữ kiện nào ⇒ unknown, KHÔNG phải deceased", () => {
  assert.equal(lifeStatus({ first_name: "Ẩn" }), "unknown");
  assert.equal(isDeceased({ first_name: "Ẩn" }), false, "unknown không bao giờ hiện dấu ✝");
});

test("is_living tường minh ⇒ theo đúng nó", () => {
  assert.equal(lifeStatus({ is_living: true }), "living");
  assert.equal(lifeStatus({ is_living: false }), "deceased");
});

test("dữ kiện mất cụ thể thắng cờ is_living còn sót", () => {
  // Nhập năm mất nhưng quên gỡ cờ "còn sống" — dữ kiện cụ thể phải thắng.
  assert.equal(lifeStatus({ is_living: true, death_year: 1998 }), "deceased");
  for (const fact of [
    { death_month: 3 },
    { death_day: 12 },
    { death_lunar: "20/7 âm" },
    { burial_location: "Nghĩa trang họ Nguyễn" },
  ]) {
    assert.equal(lifeStatus(fact), "deceased", `${JSON.stringify(fact)} phải ⇒ deceased`);
  }
});

test("0 và chuỗi rỗng KHÔNG đủ để khai tử một người", () => {
  // Không có năm/tháng/ngày 0; ô text rỗng là ô để trống. Chốt hành vi này để
  // không ai đổi sang một phép kiểm truthy lỏng hơn.
  assert.equal(lifeStatus({ death_year: 0 }), "unknown");
  assert.equal(lifeStatus({ death_lunar: "" }), "unknown");
  assert.equal(lifeStatus({ death_lunar: "   " }), "unknown");
  assert.equal(lifeStatus({ burial_location: "" }), "unknown");
});

test("field rỗng phía TRƯỚC không được che field có thật phía sau", () => {
  // Bug thật: chuỗi `a ?? b ?? c` dừng ở "" (vì "" không phải null) nên
  // burial_location bị bỏ qua hoàn toàn.
  assert.equal(
    lifeStatus({ death_lunar: "", burial_location: "Nghĩa trang họ Nguyễn" }),
    "deceased",
  );
  assert.equal(lifeStatus({ death_year: 0, death_month: 3 }), "deceased");
  assert.equal(lifeStatus({ death_year: 0, burial_location: "Quê nhà" }), "deceased");
});

test("người sống bình thường không bao giờ bị gắn deceased", () => {
  assert.equal(
    lifeStatus({ is_living: true, birth_year: 1995, phone_number: "0900000000" }),
    "living",
  );
});
