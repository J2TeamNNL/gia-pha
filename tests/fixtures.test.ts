/**
 * Kiểm fixture layout (docs/tree-layout.md §12) tự nó hợp lệ: id không trùng,
 * số người đúng như spec, và insert được vào schema thật không vi phạm ràng
 * buộc nào (kể cả sau enableForeignKeys()) — đảm bảo Phase 1B dùng lại được
 * mà không phải tự sửa dữ liệu.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { enableForeignKeys } from "../src/db/schema.ts";
import { createTestDb, insertFixture } from "./helpers/create-test-db.ts";
import {
  fixtureFourGrandparents,
  fixtureOneHusbandThreeWivesNineChildren,
  fixtureTwoSiblingsFourChildrenEach,
} from "./fixtures/family-fixtures.ts";

const fixtures = [
  ["fixtureFourGrandparents", fixtureFourGrandparents, 7],
  ["fixtureTwoSiblingsFourChildrenEach", fixtureTwoSiblingsFourChildrenEach, 14],
  ["fixtureOneHusbandThreeWivesNineChildren", fixtureOneHusbandThreeWivesNineChildren, 13],
] as const;

for (const [name, build, expectedPersonCount] of fixtures) {
  test(`${name}: số người đúng spec và id không trùng`, () => {
    const { persons, relationships } = build();
    assert.equal(persons.length, expectedPersonCount);

    const personIds = new Set(persons.map((p) => p.id));
    assert.equal(personIds.size, persons.length, "id person bị trùng");

    const relIds = new Set(relationships.map((r) => r.id));
    assert.equal(relIds.size, relationships.length, "id relationship bị trùng");

    for (const r of relationships) {
      assert.ok(personIds.has(r.person_id), `relationship trỏ tới person_id lạ: ${r.person_id}`);
      assert.ok(personIds.has(r.related_to_id), `relationship trỏ tới related_to_id lạ: ${r.related_to_id}`);
    }
  });

  test(`${name}: insert vào schema thật không vi phạm ràng buộc (FK bật)`, async () => {
    const db = await createTestDb();
    enableForeignKeys(db);
    const fixture = build();
    assert.doesNotThrow(() => insertFixture(db, fixture));

    const personCount = db.exec("SELECT count(*) FROM persons")[0].values[0][0];
    assert.equal(personCount, fixture.persons.length);
    db.close();
  });
}

test("fixtureOneHusbandThreeWivesNineChildren: đúng 9 con, chia đều 3 con/bà", () => {
  const { relationships } = fixtureOneHusbandThreeWivesNineChildren();
  const childCountByWife = new Map<string, number>();
  for (const r of relationships) {
    if (r.rel_type !== "PARENT_OF" || r.person_id === "ong-da-the") continue;
    childCountByWife.set(r.person_id, (childCountByWife.get(r.person_id) ?? 0) + 1);
  }
  assert.equal(childCountByWife.size, 3);
  for (const count of childCountByWife.values()) assert.equal(count, 3);
});

test("fixtureTwoSiblingsFourChildrenEach: mỗi anh/chị/em có đúng 4 con", () => {
  const { relationships } = fixtureTwoSiblingsFourChildrenEach();
  const childrenOfAnhCa = relationships.filter(
    (r) => r.rel_type === "PARENT_OF" && r.person_id === "anh-ca",
  );
  const childrenOfEmGai = relationships.filter(
    (r) => r.rel_type === "PARENT_OF" && r.person_id === "chong-em-gai",
  );
  assert.equal(childrenOfAnhCa.length, 4);
  assert.equal(childrenOfEmGai.length, 4);
});
