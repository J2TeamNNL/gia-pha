/**
 * Layout cây — kiểm chứng độc lập trên hàm thuần `computeTreeLayout`.
 *
 * Ba bug đã ĐO ĐƯỢC trong `docs/tree-layout.md` là mục tiêu chính ở đây:
 *  1. bà nội và ông ngoại trùng khít toạ độ (gia đình 2 cha mẹ + 4 ông bà)
 *  2. subtree anh chị em đè lên nhau
 *  3. canvas rỗng khi không giải được anchor (cây là FOREST, nhiều gốc là bình thường)
 *
 * Và hai luật bất biến không được vi phạm:
 *  - KHÔNG BAO GIỜ clone một người để giữ hình dạng cây (anh em họ lấy nhau ⇒
 *    đồ thị có chu trình) — số node phải bằng ĐÚNG số người
 *  - dữ liệu hỏng (chu trình PARENT_OF) không được làm loop vô hạn hay rớt người
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeTreeLayout,
  DEFAULT_LAYOUT_CONFIG,
  type LayoutNode,
} from "../src/lib/tree-layout.ts";
import {
  fixtureFourGrandparents,
  fixtureTwoSiblingsFourChildrenEach,
  fixtureOneHusbandThreeWivesNineChildren,
} from "./fixtures/family-fixtures.ts";

/** Cặp node nào dùng chung đúng một điểm (x, y). */
function collisions(nodes: LayoutNode[]): string[] {
  const seen = new Map<string, string>();
  const dupes: string[] = [];
  for (const n of nodes) {
    const key = `${n.x},${n.y}`;
    const other = seen.get(key);
    if (other) dupes.push(`${other} ↔ ${n.id} tại (${key})`);
    else seen.set(key, n.id);
  }
  return dupes;
}

const byId = (nodes: LayoutNode[]) => new Map(nodes.map((n) => [n.id, n]));

test("fixture 4 ông bà: không cặp nào trùng toạ độ (bug bà nội ↔ ông ngoại)", () => {
  const { persons, relationships } = fixtureFourGrandparents();
  const { nodes } = computeTreeLayout(persons, relationships);

  assert.equal(nodes.length, persons.length, "không mất và không nhân bản người nào");
  assert.deepEqual(collisions(nodes), [], "phải không còn cặp nào trùng khít");

  // Bốn ông bà phải nằm cùng một đời và ở BỐN cột x khác nhau.
  const map = byId(nodes);
  const grandparents = persons
    .map((p) => p.id)
    .filter((id) => (map.get(id)!.generation ?? 0) === 0);
  assert.equal(grandparents.length, 4, "4 ông bà đều ở đời 0");
  assert.equal(
    new Set(grandparents.map((id) => map.get(id)!.x)).size,
    4,
    "4 ông bà chiếm 4 cột x riêng biệt",
  );
});

test("y = đời tuyệt đối × pitch hằng số, không phụ thuộc chiều cao card", () => {
  const { persons, relationships } = fixtureFourGrandparents();
  const { nodes } = computeTreeLayout(persons, relationships);
  for (const n of nodes) {
    assert.equal(
      n.y,
      n.generation * DEFAULT_LAYOUT_CONFIG.rowHeight,
      `y của ${n.id} phải là đời × rowHeight`,
    );
  }
  // Đổi pitch thì y phải scale tuyến tính — chứng minh y không bị card làm lệch.
  const doubled = computeTreeLayout(persons, relationships, null, {
    rowHeight: DEFAULT_LAYOUT_CONFIG.rowHeight * 2,
  });
  const map = byId(nodes);
  for (const n of doubled.nodes) {
    assert.equal(n.y, map.get(n.id)!.y * 2);
  }
});

test("2 anh chị em × 4 con: subtree hai nhánh không đè nhau", () => {
  const { persons, relationships } = fixtureTwoSiblingsFourChildrenEach();
  const { nodes } = computeTreeLayout(persons, relationships);

  assert.equal(nodes.length, persons.length);
  assert.deepEqual(collisions(nodes), []);

  // Mọi người trong CÙNG một đời phải có x đôi một khác nhau — đây là điều kiện
  // đủ để không nhánh nào che nhánh nào.
  const byGen = new Map<number, number[]>();
  for (const n of nodes) {
    const arr = byGen.get(n.generation) ?? [];
    arr.push(n.x);
    byGen.set(n.generation, arr);
  }
  for (const [gen, xs] of byGen) {
    assert.equal(
      new Set(xs).size,
      xs.length,
      `đời ${gen} có ${xs.length} người nhưng chỉ ${new Set(xs).size} cột x`,
    );
  }
});

test("1 ông + 3 bà + 9 con: mỗi con nối về ĐÚNG cặp cha/mẹ của mình", () => {
  const { persons, relationships } = fixtureOneHusbandThreeWivesNineChildren();
  const { nodes, connectors } = computeTreeLayout(persons, relationships);

  assert.equal(nodes.length, 13);
  assert.deepEqual(collisions(nodes), []);

  // Con của bà 1 và con của bà 2 KHÔNG được lẫn nhóm: 3 family unit riêng biệt,
  // nên path cha-con phải có đúng 3 đoạn "drop" từ 3 điểm giữa khác nhau.
  const parentChild = connectors.find((c) => c.kind === "parent-child");
  assert.ok(parentChild, "phải có path cha-con");
  const dropXs = new Set(
    [...parentChild.d.matchAll(/M ([\d.-]+) [\d.-]+ L \1 /g)].map((m) => m[1]),
  );
  assert.equal(dropXs.size, 3, "3 bà ⇒ 3 nhóm con ⇒ 3 điểm giữa khác nhau");
});

test("connector gộp: TỐI ĐA một path cho mỗi loại, EX_SPOUSE tách riêng", () => {
  const persons = [
    { id: "a" },
    { id: "b" },
    { id: "c" },
    { id: "k1" },
    { id: "k2" },
  ];
  const relationships = [
    { person_id: "a", related_to_id: "b", rel_type: "SPOUSE" },
    { person_id: "a", related_to_id: "c", rel_type: "EX_SPOUSE" },
    { person_id: "a", related_to_id: "k1", rel_type: "PARENT_OF" },
    { person_id: "b", related_to_id: "k1", rel_type: "PARENT_OF" },
    { person_id: "a", related_to_id: "k2", rel_type: "PARENT_OF" },
    { person_id: "c", related_to_id: "k2", rel_type: "PARENT_OF" },
  ];
  const { connectors } = computeTreeLayout(persons, relationships);

  const kinds = connectors.map((c) => c.kind);
  assert.deepEqual(
    [...new Set(kinds)].length,
    kinds.length,
    "mỗi loại xuất hiện tối đa MỘT lần — không còn một path mỗi cạnh",
  );
  assert.ok(kinds.includes("spouse"));
  assert.ok(kinds.includes("ex-spouse"), "EX_SPOUSE phải là path riêng để vẽ khác kiểu");
  // Nhiều subpath nằm trong CÙNG một `d`.
  const spouse = connectors.find((c) => c.kind === "spouse")!;
  assert.ok(spouse.d.startsWith("M"), "d là chuỗi path hợp lệ");
});

test("anh em họ lấy nhau (đồ thị có chu trình): không clone, không loop vô hạn", () => {
  // ong → cha1, cha2 ; cha1 → x ; cha2 → y ; x kết hôn y (hai anh em họ).
  const persons = ["ong", "cha1", "cha2", "x", "y", "con"].map((id) => ({ id }));
  const relationships = [
    { person_id: "ong", related_to_id: "cha1", rel_type: "PARENT_OF" },
    { person_id: "ong", related_to_id: "cha2", rel_type: "PARENT_OF" },
    { person_id: "cha1", related_to_id: "x", rel_type: "PARENT_OF" },
    { person_id: "cha2", related_to_id: "y", rel_type: "PARENT_OF" },
    { person_id: "x", related_to_id: "y", rel_type: "SPOUSE" },
    { person_id: "x", related_to_id: "con", rel_type: "PARENT_OF" },
    { person_id: "y", related_to_id: "con", rel_type: "PARENT_OF" },
  ];

  const { nodes } = computeTreeLayout(persons, relationships);
  assert.equal(nodes.length, 6, "6 người ⇒ ĐÚNG 6 node, không nhân bản ai");
  assert.equal(new Set(nodes.map((n) => n.id)).size, 6, "id không trùng");
  assert.deepEqual(collisions(nodes), []);
  // Cả hai vẫn giữ vị trí theo huyết thống riêng, và `con` ở đời sau cả hai.
  const map = byId(nodes);
  assert.equal(map.get("x")!.generation, 2);
  assert.equal(map.get("y")!.generation, 2);
  assert.equal(map.get("con")!.generation, 3);
});

test("FOREST: nhiều component rời rạc đều được vẽ, không ai bị bỏ", () => {
  const persons = ["a1", "a2", "b1", "b2", "lone"].map((id) => ({ id }));
  const relationships = [
    { person_id: "a1", related_to_id: "a2", rel_type: "PARENT_OF" },
    { person_id: "b1", related_to_id: "b2", rel_type: "PARENT_OF" },
  ];
  const { nodes } = computeTreeLayout(persons, relationships);

  assert.equal(nodes.length, 5, "cả người đứng một mình cũng phải có node");
  assert.deepEqual(collisions(nodes), []);
  assert.equal(
    new Set(nodes.map((n) => n.componentId)).size,
    3,
    "3 component rời rạc — đây là trạng thái BÌNH THƯỜNG, không phải lỗi",
  );
});

test("anchor không giải được / không tồn tại: vẫn vẽ đủ, không trả về rỗng", () => {
  const { persons, relationships } = fixtureFourGrandparents();
  for (const anchor of [null, undefined, "khong-ton-tai"]) {
    const { nodes } = computeTreeLayout(persons, relationships, anchor);
    assert.equal(nodes.length, persons.length, `anchor=${anchor} vẫn phải vẽ đủ`);
  }
});

test("dữ liệu hỏng — chu trình PARENT_OF không có gốc: dừng, và không rớt ai", () => {
  // a → b → c → a. Không ai là gốc. Bản cũ sẽ đệ quy vô tận hoặc trả về rỗng.
  const persons = ["a", "b", "c", "d"].map((id) => ({ id }));
  const relationships = [
    { person_id: "a", related_to_id: "b", rel_type: "PARENT_OF" },
    { person_id: "b", related_to_id: "c", rel_type: "PARENT_OF" },
    { person_id: "c", related_to_id: "a", rel_type: "PARENT_OF" },
    { person_id: "d", related_to_id: "d", rel_type: "PARENT_OF" }, // tự làm cha mình
  ];
  const { nodes } = computeTreeLayout(persons, relationships);

  assert.equal(nodes.length, 4, "không rớt người nào dù dữ liệu hỏng");
  for (const n of nodes) {
    assert.ok(Number.isFinite(n.x), `x của ${n.id} phải là số hữu hạn`);
    assert.ok(Number.isFinite(n.y), `y của ${n.id} phải là số hữu hạn`);
  }
});

test("cây rỗng và cây một người: không ném lỗi", () => {
  assert.deepEqual(computeTreeLayout([], []), { nodes: [], connectors: [] });
  const one = computeTreeLayout([{ id: "solo" }], []);
  assert.equal(one.nodes.length, 1);
  assert.equal(one.nodes[0].generation, 0);
});
