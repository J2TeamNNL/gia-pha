/**
 * Fixture layout tái dùng được cho cả test DB (constraints/schema) và test
 * layout canvas (Phase 1B) — xem docs/tree-layout.md §12.
 *
 * Mỗi hàm trả về `{ persons, relationships }` độc lập, id xâu tay (không
 * random) để test dễ debug và không phụ thuộc uuid.
 */
import type { Gender, Person, Relationship, RelationshipType } from "../../src/db/types.ts";

export interface FixtureData {
  persons: Person[];
  relationships: Relationship[];
}

function person(overrides: { id: string; first_name: string; gender: Gender } & Partial<Person>): Person {
  return {
    is_living: true,
    ...overrides,
  };
}

function rel(
  personId: string,
  relatedToId: string,
  relType: RelationshipType,
  isPrimary = true,
): Relationship {
  return {
    id: `rel-${personId}-${relType}-${relatedToId}`,
    person_id: personId,
    related_to_id: relatedToId,
    rel_type: relType,
    is_primary: isPrimary,
  };
}

/**
 * Fixture (a): mình + 2 cha mẹ + 4 ông bà (nội + ngoại) — 7 người.
 * Kỳ vọng ở layout: không cặp card nào trùng toạ độ (bug đã biết: bà nội
 * và ông ngoại trùng khít ở gia đình 2 cha mẹ + 4 ông bà).
 */
export function fixtureFourGrandparents(): FixtureData {
  const ongNoi = person({ id: "ong-noi", first_name: "Ông Nội", gender: "MALE" });
  const baNoi = person({ id: "ba-noi", first_name: "Bà Nội", gender: "FEMALE" });
  const ongNgoai = person({ id: "ong-ngoai", first_name: "Ông Ngoại", gender: "MALE" });
  const baNgoai = person({ id: "ba-ngoai", first_name: "Bà Ngoại", gender: "FEMALE" });
  const cha = person({ id: "cha", first_name: "Cha", gender: "MALE" });
  const me = person({ id: "me", first_name: "Mẹ", gender: "FEMALE" });
  const minh = person({ id: "minh", first_name: "Mình", gender: "MALE" });

  return {
    persons: [ongNoi, baNoi, ongNgoai, baNgoai, cha, me, minh],
    relationships: [
      rel(ongNoi.id, baNoi.id, "SPOUSE"),
      rel(ongNgoai.id, baNgoai.id, "SPOUSE"),
      rel(ongNoi.id, cha.id, "PARENT_OF"),
      rel(baNoi.id, cha.id, "PARENT_OF"),
      rel(ongNgoai.id, me.id, "PARENT_OF"),
      rel(baNgoai.id, me.id, "PARENT_OF"),
      rel(cha.id, me.id, "SPOUSE"),
      rel(cha.id, minh.id, "PARENT_OF"),
      rel(me.id, minh.id, "PARENT_OF", false),
    ],
  };
}

/**
 * Fixture (b): 1 cặp ông bà cố + 2 anh chị em (mỗi người có vợ/chồng) × 4
 * con mỗi người — 6 người lớn + 8 cháu = 14 người.
 * Kỳ vọng ở layout: 8 card cháu, không cái nào bị che bởi subtree nhánh kia.
 */
export function fixtureTwoSiblingsFourChildrenEach(): FixtureData {
  const ongCo = person({ id: "ong-co", first_name: "Ông Cố", gender: "MALE" });
  const baCo = person({ id: "ba-co", first_name: "Bà Cố", gender: "FEMALE" });
  const anhCa = person({ id: "anh-ca", first_name: "Anh Cả", gender: "MALE" });
  const voAnhCa = person({ id: "vo-anh-ca", first_name: "Vợ Anh Cả", gender: "FEMALE" });
  const emGai = person({ id: "em-gai", first_name: "Em Gái", gender: "FEMALE" });
  const chongEmGai = person({ id: "chong-em-gai", first_name: "Chồng Em Gái", gender: "MALE" });

  const childrenAnhCa = Array.from({ length: 4 }, (_, i) =>
    person({
      id: `con-anh-ca-${i + 1}`,
      first_name: `Con Anh Cả ${i + 1}`,
      gender: i % 2 === 0 ? "MALE" : "FEMALE",
    }),
  );
  const childrenEmGai = Array.from({ length: 4 }, (_, i) =>
    person({
      id: `con-em-gai-${i + 1}`,
      first_name: `Con Em Gái ${i + 1}`,
      gender: i % 2 === 0 ? "MALE" : "FEMALE",
    }),
  );

  return {
    persons: [ongCo, baCo, anhCa, voAnhCa, emGai, chongEmGai, ...childrenAnhCa, ...childrenEmGai],
    relationships: [
      rel(ongCo.id, baCo.id, "SPOUSE"),
      rel(ongCo.id, anhCa.id, "PARENT_OF"),
      rel(baCo.id, anhCa.id, "PARENT_OF"),
      rel(ongCo.id, emGai.id, "PARENT_OF"),
      rel(baCo.id, emGai.id, "PARENT_OF"),
      rel(anhCa.id, voAnhCa.id, "SPOUSE"),
      rel(emGai.id, chongEmGai.id, "SPOUSE"),
      ...childrenAnhCa.flatMap((c) => [
        rel(anhCa.id, c.id, "PARENT_OF"),
        rel(voAnhCa.id, c.id, "PARENT_OF", false),
      ]),
      ...childrenEmGai.flatMap((c) => [
        rel(chongEmGai.id, c.id, "PARENT_OF"),
        rel(emGai.id, c.id, "PARENT_OF", false),
      ]),
    ],
  };
}

/**
 * Fixture (c): 1 ông (đa thê) + 3 bà + 9 con chia đều theo từng bà (3 con/bà)
 * — 13 người.
 * Kỳ vọng ở layout: mỗi con nối về đúng cặp cha/mẹ của mình; các đoạn ngang
 * (ông–bà1, ông–bà2, ông–bà3) khác cao độ để không chồng lấn.
 */
export function fixtureOneHusbandThreeWivesNineChildren(): FixtureData {
  const ong = person({ id: "ong-da-the", first_name: "Ông", gender: "MALE" });
  const wives = [1, 2, 3].map((n) =>
    person({ id: `ba-${n}`, first_name: `Bà ${n}`, gender: "FEMALE" }),
  );

  const persons: Person[] = [ong, ...wives];
  const relationships: Relationship[] = [];

  wives.forEach((wife, wi) => {
    relationships.push(rel(ong.id, wife.id, "SPOUSE"));
    for (let i = 0; i < 3; i++) {
      const child = person({
        id: `con-ba${wi + 1}-${i + 1}`,
        first_name: `Con Bà ${wi + 1} - ${i + 1}`,
        gender: i % 2 === 0 ? "MALE" : "FEMALE",
      });
      persons.push(child);
      relationships.push(rel(ong.id, child.id, "PARENT_OF"));
      relationships.push(rel(wife.id, child.id, "PARENT_OF", false));
    }
  });

  return { persons, relationships };
}
