/**
 * Migration v1 → v2 trên ca khó nhất trong spec
 * (`plans/260821-2350-restructure-v1/migration.md` §4).
 *
 * Bất biến số một, kiểm ở mọi test: **KHÔNG MẤT NGƯỜI NÀO.**
 *
 * Ca dùng để kiểm là gia đình ông Giáp: 3 bà, con chia theo từng bà, một đứa con
 * chỉ ghi được một cha, một ca nhận nuôi, một cuộc hôn nhân cận huyết (bác–cháu)
 * làm đồ thị có chu trình, và một cạnh cha-con hỏng cố tình chèn vào để xem
 * migration có gỡ đúng cạnh đó không.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createEmptyDb } from "./helpers/create-test-db.ts";
import { migrateToV2, normalizePhone, MigrationError } from "../src/db/migrate-v2.ts";
import { getUserVersion, isV2Schema } from "../src/db/schema-v2.ts";

type Db = import("sql.js").Database;

const count = (db: Db, sql: string) => Number(db.exec(sql)[0].values[0][0]);
const one = (db: Db, sql: string) => {
  const r = db.exec(sql);
  return r.length && r[0].values.length ? r[0].values[0][0] : null;
};

/**
 * DB v1 mô phỏng dữ liệu thật: ông Giáp + 3 bà + con theo từng bà + con không rõ
 * mẹ + con nuôi + hôn nhân cận huyết. Cột `is_living` cố tình để NULL ở một người.
 */
async function buildLegacyFamily() {
  const db = await createEmptyDb();
  db.run(`
    CREATE TABLE persons (
      id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT, middle_name TEXT,
      title_prefix TEXT, gender TEXT DEFAULT 'MALE', is_living INTEGER DEFAULT 1,
      birth_year INTEGER, birth_month INTEGER, birth_day INTEGER,
      death_year INTEGER, death_month INTEGER, death_day INTEGER, death_lunar TEXT,
      burial_location TEXT, phone_number TEXT, contact_address TEXT, zalo_link TEXT,
      fb_link TEXT, avatar_url TEXT, biography TEXT, notes TEXT, is_anchor INTEGER DEFAULT 0,
      created_at DATETIME, updated_at DATETIME
    );
    CREATE TABLE relationships (
      id TEXT PRIMARY KEY, person_id TEXT NOT NULL, related_to_id TEXT NOT NULL,
      rel_type TEXT NOT NULL, is_primary INTEGER DEFAULT 0
    );

    INSERT INTO persons (id, first_name, last_name, gender, is_living, birth_year, death_year, death_lunar, phone_number, is_anchor, created_at)
      VALUES ('giap','Giáp','Nguyễn','MALE',0,1900,1975,'20 tháng 7 âm','0912345678',0,'2026-03-12 08:30:00');
    INSERT INTO persons (id, first_name, last_name, gender, is_living) VALUES
      ('ba1','Cả','Trần','FEMALE',0),
      ('ba2','Hai','Lê','female',0),
      ('ba3','Ba','Võ',NULL,NULL);
    INSERT INTO persons (id, first_name, last_name, gender, is_living, birth_year, birth_month, birth_day) VALUES
      ('c1','Một','Nguyễn','MALE',1,1925,4,3),
      ('c2','Hai','Nguyễn','MALE',1,1928,NULL,NULL),
      ('c3','Ba','Nguyễn','FEMALE',1,1935,NULL,12),
      ('c4','Tư','Nguyễn','MALE',1,1940,NULL,NULL);
    INSERT INTO persons (id, first_name, gender, is_living) VALUES ('nuoi','Nuôi','MALE',1);
    INSERT INTO persons (id, first_name, last_name, gender, is_living) VALUES
      ('chau','Cháu','Nguyễn','FEMALE',1),
      ('chit','Chít','Nguyễn','MALE',1);

    -- 3 cuộc hôn nhân của ông Giáp. Cạnh SPOUSE ghi CẢ HAI CHIỀU với bà cả
    -- (đúng như QuickAddForm đang ghi), một chiều với hai bà còn lại.
    INSERT INTO relationships VALUES ('r1','giap','ba1','SPOUSE',1);
    INSERT INTO relationships VALUES ('r2','ba1','giap','SPOUSE',0);
    INSERT INTO relationships VALUES ('r3','giap','ba2','SPOUSE',0);
    INSERT INTO relationships VALUES ('r4','giap','ba3','EX_SPOUSE',0);

    -- Con bà cả: cả hai cha mẹ đều ghi ⇒ neo được vào union.
    INSERT INTO relationships VALUES ('r10','giap','c1','PARENT_OF',1);
    INSERT INTO relationships VALUES ('r11','ba1','c1','PARENT_OF',0);
    -- Con bà hai.
    INSERT INTO relationships VALUES ('r12','giap','c2','PARENT_OF',1);
    INSERT INTO relationships VALUES ('r13','ba2','c2','PARENT_OF',0);
    -- Con CHỈ ghi được cha ⇒ không suy được thuộc bà nào.
    INSERT INTO relationships VALUES ('r14','giap','c3','PARENT_OF',1);
    -- Con bà ba (đã ly hôn).
    INSERT INTO relationships VALUES ('r15','giap','c4','PARENT_OF',1);
    INSERT INTO relationships VALUES ('r16','ba3','c4','PARENT_OF',0);
    -- Con nuôi của ông Giáp và bà cả.
    INSERT INTO relationships VALUES ('r17','giap','nuoi','ADOPTED_PARENT_OF',0);
    INSERT INTO relationships VALUES ('r18','ba1','nuoi','ADOPTED_PARENT_OF',0);
    -- Cháu và chít — chuỗi huyết thống để tạo chu trình hỏng ở test riêng.
    INSERT INTO relationships VALUES ('r19','c1','chau','PARENT_OF',1);
    INSERT INTO relationships VALUES ('r20','chau','chit','PARENT_OF',1);
    -- Cạnh cha-con TRÙNG LẶP (R5) và rel_type SAI CHÍNH TẢ (R1).
    INSERT INTO relationships VALUES ('r21','giap','c1','PARENT_OF',0);
    INSERT INTO relationships VALUES ('r22','giap','chau','PARNET_OF',0);
  `);
  return db;
}

test("không mất người nào, và schema sau migration là v2", async () => {
  const db = await buildLegacyFamily();
  const before = count(db, "SELECT count(*) FROM persons");

  const report = migrateToV2(db);

  assert.equal(report.counts.personsAfter, before, "số người phải bằng đúng trước migration");
  assert.equal(before, 11, "fixture: giap + 3 bà + 4 con + con nuôi + cháu + chít");
  assert.ok(isV2Schema(db), "đủ 6 bảng v2");
  assert.equal(getUserVersion(db), 2);
  assert.equal(count(db, "SELECT count(*) FROM sqlite_master WHERE name='relationships'"), 0,
    "bảng relationships cũ đã được dọn");
  db.close();
});

test("1 ông + 3 bà: mỗi bà một union, con neo về ĐÚNG bà của mình", async () => {
  const db = await buildLegacyFamily();
  migrateToV2(db);

  assert.equal(count(db, "SELECT count(*) FROM unions"), 3, "3 cuộc hôn nhân, không phải 4 (cạnh hai chiều đã gộp)");
  assert.equal(
    count(db, "SELECT count(*) FROM union_partners WHERE person_id='giap'"), 3,
    "ông Giáp tham gia cả 3",
  );

  // Con bà cả và con bà hai phải nằm ở HAI union khác nhau — đây là điều v1
  // không diễn đạt được và là yêu cầu người dùng lặp lại nhiều nhất.
  const u1 = one(db, "SELECT union_id FROM parentages WHERE child_id='c1' AND parent_id='giap'");
  const u2 = one(db, "SELECT union_id FROM parentages WHERE child_id='c2' AND parent_id='giap'");
  assert.ok(u1, "con bà cả neo được vào union");
  assert.ok(u2, "con bà hai neo được vào union");
  assert.notEqual(u1, u2, "con của hai bà KHÔNG được chung một union");

  // Mẹ và cha của cùng đứa con phải trỏ về cùng union.
  assert.equal(
    one(db, "SELECT union_id FROM parentages WHERE child_id='c1' AND parent_id='ba1'"), u1,
  );
  db.close();
});

test("con chỉ ghi được một cha: union_id = NULL, confidence UNCERTAIN, và VÀO danh sách hỏi", async () => {
  const db = await buildLegacyFamily();
  const report = migrateToV2(db);

  assert.equal(
    one(db, "SELECT union_id FROM parentages WHERE child_id='c3'"), null,
    "không suy được thì để NULL, không đoán",
  );
  assert.equal(one(db, "SELECT confidence FROM parentages WHERE child_id='c3'"), "UNCERTAIN");
  assert.ok(
    report.reviewList.some((r) => r.kind === "CHILD_UNION_UNKNOWN" && r.personId === "c3"),
    "phải có mục hỏi người dùng cho đứa con này",
  );
  db.close();
});

test("thứ tự vợ cả/vợ hai KHÔNG được đoán — seq NULL và vào danh sách hỏi", async () => {
  const db = await buildLegacyFamily();
  const report = migrateToV2(db);

  // Ông Giáp có 3 union ⇒ thứ tự không suy được từ danh sách cạnh vô thứ tự.
  const seqs = db
    .exec("SELECT partner_seq FROM union_partners WHERE person_id='giap'")[0]
    .values.map((r) => r[0]);
  assert.deepEqual(seqs, [null, null, null], "3 cuộc ⇒ không đoán thứ tự");

  // Mỗi bà chỉ có một cuộc ⇒ seq = 1 là suy được chắc chắn.
  assert.equal(one(db, "SELECT partner_seq FROM union_partners WHERE person_id='ba1'"), 1);
  assert.ok(
    report.reviewList.some((r) => r.kind === "MARRIAGE_ORDER_UNKNOWN" && r.personId === "giap"),
  );
  db.close();
});

test("nhận nuôi bởi CẢ HAI vợ chồng = hai dòng ADOPTIVE chung một union", async () => {
  const db = await buildLegacyFamily();
  migrateToV2(db);

  const adoptive = db.exec(
    "SELECT parent_id, union_id, kind FROM parentages WHERE child_id='nuoi' ORDER BY parent_id",
  )[0].values;
  assert.equal(adoptive.length, 2, "hai cha/mẹ nuôi = hai dòng, không phải một cột 'kind' đặc biệt");
  assert.ok(adoptive.every((r) => r[2] === "ADOPTIVE"));
  assert.equal(adoptive[0][1], adoptive[1][1], "cùng trỏ về một union");
  db.close();
});

test("ngày sinh/mất tách sang date_facts, ngày-không-tháng bị bỏ và ĐƯỢC BÁO", async () => {
  const db = await buildLegacyFamily();
  const report = migrateToV2(db);

  // c1: 1925-04-03 đủ ba phần ⇒ EXACT.
  assert.equal(one(db, "SELECT precision FROM date_facts WHERE person_id='c1' AND kind='BIRTH'"), "EXACT");
  // c2: chỉ có năm ⇒ YEAR_ONLY.
  assert.equal(one(db, "SELECT precision FROM date_facts WHERE person_id='c2' AND kind='BIRTH'"), "YEAR_ONLY");
  // giap: có cả BIRTH và DEATH.
  assert.equal(count(db, "SELECT count(*) FROM date_facts WHERE person_id='giap'"), 2);

  // c3: có birth_year 1935 và birth_day 12 nhưng KHÔNG có tháng. Ngày không tháng
  // không phải một ngày; CHECK sẽ từ chối. Phải bỏ phần ngày và báo cho người dùng.
  assert.ok(
    report.reviewList.some((r) => r.kind === "DATE_DROPPED" && r.personId === "c3"),
    "phải báo là đã bỏ, không im lặng",
  );
  db.close();
});

test("ngày mất âm lịch dạng chữ KHÔNG bị parse — giữ nguyên trong ghi chú và hỏi lại", async () => {
  const db = await buildLegacyFamily();
  const report = migrateToV2(db);

  const notes = String(one(db, "SELECT notes FROM persons WHERE id='giap'"));
  assert.match(notes, /20 tháng 7 âm/, "chữ gốc phải còn nguyên — luật bất biến #7");
  assert.ok(report.reviewList.some((r) => r.kind === "LUNAR_DEATH_TEXT" && r.personId === "giap"));
  db.close();
});

test("gender lạ ⇒ UNKNOWN, không đoán; is_living NULL vẫn là NULL", async () => {
  const db = await buildLegacyFamily();
  migrateToV2(db);

  assert.equal(one(db, "SELECT gender FROM persons WHERE id='ba2'"), "FEMALE", "'female' chữ thường vẫn nhận ra");
  assert.equal(one(db, "SELECT gender FROM persons WHERE id='ba3'"), "UNKNOWN", "NULL ⇒ UNKNOWN, KHÔNG ⇒ MALE");
  assert.equal(one(db, "SELECT is_living FROM persons WHERE id='ba3'"), null, "chưa rõ vẫn là chưa rõ");
  db.close();
});

test("số điện thoại chuẩn hoá về +84; đổi tên cột sang given_name/family_name", async () => {
  const db = await buildLegacyFamily();
  migrateToV2(db);

  assert.equal(one(db, "SELECT phone FROM persons WHERE id='giap'"), "+84912345678");
  assert.equal(one(db, "SELECT given_name FROM persons WHERE id='giap'"), "Giáp");
  assert.equal(one(db, "SELECT family_name FROM persons WHERE id='giap'"), "Nguyễn");
  assert.equal(
    one(db, "SELECT created_at FROM persons WHERE id='giap'"), "2026-03-12T08:30:00Z",
    "timestamp đổi sang ISO-8601",
  );
  db.close();
});

test("normalizePhone: các dạng thật, và không parse được thì trả null", () => {
  assert.equal(normalizePhone("0912345678"), "+84912345678");
  assert.equal(normalizePhone("091 234 5678"), "+84912345678");
  assert.equal(normalizePhone("+84912345678"), "+84912345678");
  assert.equal(normalizePhone("84912345678"), "+84912345678");
  assert.equal(normalizePhone("(024) 3825-1234"), "+842438251234");
  assert.equal(normalizePhone("gọi qua nhà bác Tư"), null, "chữ tự do ⇒ null, giữ lại trong notes");
  assert.equal(normalizePhone(null), null);
});

test("cạnh trùng lặp và rel_type sai chính tả đều được ghi nhận rồi mới bỏ", async () => {
  const db = await buildLegacyFamily();
  const report = migrateToV2(db);

  assert.ok(report.repairs.some((r) => r.step === "R1"), "rel_type ngoài enum ('PARNET_OF')");
  assert.ok(report.repairs.some((r) => r.step === "R4"), "cạnh SPOUSE hai chiều");
  assert.ok(report.repairs.some((r) => r.step === "R5"), "cạnh cha-con trùng");
  assert.equal(
    count(db, "SELECT count(*) FROM parentages WHERE child_id='c1' AND parent_id='giap'"), 1,
    "cạnh trùng chỉ còn một dòng",
  );
  db.close();
});

test("chu trình cha-con: gỡ ĐÚNG cạnh mới nhất, không phá quan hệ hợp lệ", async () => {
  const db = await buildLegacyFamily();
  // giap → c1 → chau → chit, rồi chèn chit → giap để đóng vòng. Cạnh cuối cùng
  // (rowid lớn nhất) là lỗi nhập; ba cạnh kia là quan hệ thật.
  db.run("INSERT INTO relationships VALUES ('r99','chit','giap','PARENT_OF',0)");

  const report = migrateToV2(db);

  assert.ok(report.repairs.some((r) => r.step === "R1b" && r.rows === 1), "gỡ đúng MỘT cạnh");
  assert.equal(
    count(db, "SELECT count(*) FROM parentages WHERE child_id='giap' AND parent_id='chit'"), 0,
    "cạnh đóng vòng đã bị gỡ",
  );
  for (const [parent, child] of [["giap", "c1"], ["c1", "chau"], ["chau", "chit"]]) {
    assert.equal(
      count(db, `SELECT count(*) FROM parentages WHERE parent_id='${parent}' AND child_id='${child}'`),
      1,
      `quan hệ hợp lệ ${parent}→${child} phải còn nguyên`,
    );
  }
  assert.ok(report.reviewList.some((r) => r.kind === "CYCLE_BROKEN"), "phải báo cho người dùng biết");
  db.close();
});

test("hôn nhân cận huyết: giữ cross-link, KHÔNG nhân bản ai", async () => {
  const db = await buildLegacyFamily();
  // c4 (con ông Giáp) cưới chau (cháu ông Giáp) — bác lấy cháu. Đồ thị có chu
  // trình vô hướng nhưng KHÔNG có chu trình tổ tiên, nên không được gỡ cạnh nào.
  db.run("INSERT INTO relationships VALUES ('r98','c4','chau','SPOUSE',0)");
  const before = count(db, "SELECT count(*) FROM persons");

  const report = migrateToV2(db);

  assert.equal(report.counts.personsAfter, before, "không nhân bản, không mất ai");
  assert.equal(count(db, "SELECT count(*) FROM unions"), 4, "thêm đúng một union");
  assert.equal(
    report.repairs.filter((r) => r.step === "R1b").length, 0,
    "hôn nhân cận huyết KHÔNG phải chu trình tổ tiên — không được gỡ cạnh nào",
  );
  // Ông Giáp vẫn là tổ tiên của chit qua đúng một bản ghi người duy nhất.
  assert.equal(count(db, "SELECT count(*) FROM persons WHERE id='giap'"), 1);
  db.close();
});

test("migrate lần hai bị từ chối", async () => {
  const db = await buildLegacyFamily();
  migrateToV2(db);
  assert.throws(() => migrateToV2(db), MigrationError);
  db.close();
});

test("file từ bản app mới hơn: từ chối, không đụng vào", async () => {
  const db = await buildLegacyFamily();
  db.run("PRAGMA user_version = 99");
  assert.throws(() => migrateToV2(db), MigrationError);
  assert.equal(getUserVersion(db), 99);
  db.close();
});

test("báo cáo migration được lưu trong file, sống sót qua export/import", async () => {
  const db = await buildLegacyFamily();
  const report = migrateToV2(db);
  const bytes = db.export();
  db.close();

  const reopened = await createEmptyDb(bytes);
  const stored = JSON.parse(
    String(one(reopened, "SELECT value FROM app_settings WHERE key='migration_report'")),
  );
  assert.equal(stored.counts.personsAfter, report.counts.personsAfter);
  assert.equal(stored.reviewList.length, report.reviewList.length);
  assert.equal(getUserVersion(reopened), 2);
  reopened.close();
});
