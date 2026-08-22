/**
 * Truy vấn dữ liệu người và quan hệ.
 *
 * Mọi thao tác NHIỀU câu lệnh phải bọc trong `withTransaction` — nếu không, một
 * câu lệnh giữa chừng thất bại sẽ để lại DB ở trạng thái nửa vời rồi được
 * persist nguyên trạng (xem `docs/sync-durability.md` §4.5).
 */
import { v4 as uuidv4 } from "uuid";
import type { Person, Relationship, RelationshipType } from "./types";
import { getDb, saveDb } from "./client";
import { WRITABLE_PERSON_COLUMNS } from "./schema";

type Db = import("sql.js").Database;
type SqlValue = string | number | Uint8Array | null;

/** Cột lưu 0/1 nhưng đọc ra boolean. */
const BOOLEAN_COLUMNS = new Set(["is_living", "is_anchor", "is_primary"]);

/**
 * Đọc kết quả bằng `prepare()` + `getAsObject()`, KHÔNG dùng `db.exec()`.
 *
 * Lý do không phải sở thích: bản `sql.js` mà Next/Turbopack nạp cho browser
 * (`dist/sql-wasm-browser.js`) bị minify tới mức object trả về từ `db.exec()`
 * có property `columns` **đổi tên thành `lc`**, trong khi bản Node giữ nguyên
 * `columns`. Đọc theo tên property là đọc vào một thứ minifier được phép đổi.
 * `getAsObject()` lấy tên cột từ chính SQLite nên giống hệt ở cả hai bản —
 * đã kiểm chứng song song. Test hồi quy: `tests/sqljs-browser-build.test.ts`.
 */
function mapRows<T>(db: Db, sql: string): T[] {
  const stmt = db.prepare(sql);
  const out: T[] = [];
  try {
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, SqlValue>;
      for (const col of Object.keys(row)) {
        if (!BOOLEAN_COLUMNS.has(col)) continue;
        // NULL ⇒ `undefined` (KHÔNG RÕ), không phải `false`. Bản cũ đọc NULL
        // thành false nên người chưa rõ trạng thái bị gắn dấu ✝ — app tự khai tử họ.
        (row as Record<string, SqlValue | boolean | undefined>)[col] =
          row[col] === null ? undefined : row[col] === 1 || row[col] === "1";
      }
      out.push(row as unknown as T);
    }
  } finally {
    stmt.free();
  }
  return out;
}

/**
 * Bọc nhiều câu lệnh trong một transaction. Rollback khi lỗi, và KHÔNG persist
 * nếu rollback — vì `saveDb()` chỉ được gọi sau khi COMMIT thành công.
 */
function withTransaction<T>(db: Db, fn: () => T): T {
  db.run("BEGIN");
  try {
    const out = fn();
    db.run("COMMIT");
    return out;
  } catch (err) {
    try {
      db.run("ROLLBACK");
    } catch {
      // Không có transaction đang mở — bỏ qua.
    }
    throw err;
  }
}

export async function getAllPersons(): Promise<Person[]> {
  const db = await getDb();
  return mapRows<Person>(db, "SELECT * FROM persons ORDER BY last_name, first_name");
}

function escapeSql(val: string | number | null | boolean | undefined): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "1" : "0";
  if (typeof val === "number") return val.toString();
  return `'${String(val).replace(/'/g, "''")}'`;
}

function insertPersonSql(person: Person): string {
  return `INSERT INTO persons (
       id, first_name, last_name, middle_name, title_prefix,
       gender, is_living,
       birth_year, birth_month, birth_day,
       death_year, death_month, death_day, death_lunar, burial_location,
       phone_number, contact_address, zalo_link, fb_link,
       avatar_url, biography, notes, is_anchor
     ) VALUES (
       ${escapeSql(person.id)}, ${escapeSql(person.first_name)}, ${escapeSql(person.last_name)},
       ${escapeSql(person.middle_name)}, ${escapeSql(person.title_prefix)},
       ${escapeSql(person.gender)}, ${escapeSql(person.is_living)},
       ${escapeSql(person.birth_year)}, ${escapeSql(person.birth_month)}, ${escapeSql(person.birth_day)},
       ${escapeSql(person.death_year)}, ${escapeSql(person.death_month)}, ${escapeSql(person.death_day)},
       ${escapeSql(person.death_lunar)}, ${escapeSql(person.burial_location)},
       ${escapeSql(person.phone_number)}, ${escapeSql(person.contact_address)},
       ${escapeSql(person.zalo_link)}, ${escapeSql(person.fb_link)},
       ${escapeSql(person.avatar_url)}, ${escapeSql(person.biography)},
       ${escapeSql(person.notes)}, ${escapeSql(person.is_anchor)}
     )`;
}

function insertRelationshipSql(rel: Relationship): string {
  return `INSERT INTO relationships (id, person_id, related_to_id, rel_type, is_primary) VALUES (${escapeSql(rel.id)}, ${escapeSql(rel.person_id)}, ${escapeSql(rel.related_to_id)}, ${escapeSql(rel.rel_type)}, ${rel.is_primary ? 1 : 0})`;
}

export async function createPerson(data: Omit<Person, "id">): Promise<Person> {
  const db = await getDb();
  const person: Person = { id: uuidv4(), ...data };
  db.run(insertPersonSql(person));
  await saveDb();
  return person;
}

/**
 * Một cạnh sẽ được tạo cùng lúc với người mới, mô tả TƯƠNG ĐỐI so với người đó.
 * `direction: "from"` ⇒ người mới là `person_id`; `"to"` ⇒ người mới là `related_to_id`.
 */
export interface PendingLink {
  otherId: string;
  rel_type: RelationshipType;
  direction: "from" | "to";
  is_primary?: boolean;
}

/**
 * Tạo người MỚI cùng mọi quan hệ của họ trong MỘT transaction.
 *
 * Vì sao cần: gọi `createPerson()` rồi `createRelationship()` riêng lẻ có một
 * đường thất bại thật — người đã được ghi, rồi cạnh bị ràng buộc DB chặn
 * (chu trình / tự làm cha mình / trỏ tới người không tồn tại) ⇒ còn lại một
 * người mồ côi trong DB dù giao diện báo lỗi. Ở đây ROLLBACK huỷ cả hai, và
 * `saveDb()` chỉ chạy sau khi COMMIT thành công nên đĩa không bao giờ thấy
 * trạng thái nửa vời.
 */
export async function createPersonWithRelationships(
  data: Omit<Person, "id">,
  links: PendingLink[] = [],
): Promise<{ person: Person; relationships: Relationship[] }> {
  const db = await getDb();
  const person: Person = { id: uuidv4(), ...data };
  const relationships: Relationship[] = links.map((link) => ({
    id: uuidv4(),
    person_id: link.direction === "from" ? person.id : link.otherId,
    related_to_id: link.direction === "from" ? link.otherId : person.id,
    rel_type: link.rel_type,
    is_primary: link.is_primary ?? false,
  }));

  withTransaction(db, () => {
    db.run(insertPersonSql(person));
    for (const rel of relationships) db.run(insertRelationshipSql(rel));
  });
  await saveDb();
  return { person, relationships };
}

export async function setAnchorPerson(id: string): Promise<void> {
  const db = await getDb();
  withTransaction(db, () => {
    db.run("UPDATE persons SET is_anchor = 0");
    db.run(`UPDATE persons SET is_anchor = 1 WHERE id = ${escapeSql(id)}`);
  });
  await saveDb();
}

/** Tên cột lạ gửi tới `updatePerson` — chặn thay vì ghép vào câu SQL. */
export class UnknownColumnError extends Error {
  constructor(columns: string[]) {
    super(`Không nhận cột: ${columns.join(", ")}`);
    this.name = "UnknownColumnError";
  }
}

export async function updatePerson(
  id: string,
  data: Partial<Omit<Person, "id">>,
): Promise<void> {
  const entries = Object.entries(data);
  // Allowlist tên cột. `escapeSql` chỉ quote GIÁ TRỊ; tên cột thì trước đây đi
  // thẳng vào SQL không qua bất cứ kiểm tra nào.
  const unknown = entries
    .map(([k]) => k)
    .filter((k) => !WRITABLE_PERSON_COLUMNS.has(k));
  if (unknown.length) throw new UnknownColumnError(unknown);
  if (entries.length === 0) return;

  const db = await getDb();
  const fieldsSql = entries.map(([k, v]) => `${k} = ${escapeSql(v)}`).join(", ");
  db.run(
    `UPDATE persons SET ${fieldsSql}, updated_at = CURRENT_TIMESTAMP WHERE id = ${escapeSql(id)}`,
  );
  await saveDb();
}

export async function deletePerson(id: string): Promise<void> {
  const db = await getDb();
  // Xoá cạnh trước rồi mới xoá người: ngược lại sẽ vi phạm khoá ngoại.
  withTransaction(db, () => {
    db.run(
      `DELETE FROM relationships WHERE person_id = ${escapeSql(id)} OR related_to_id = ${escapeSql(id)}`,
    );
    db.run(`DELETE FROM persons WHERE id = ${escapeSql(id)}`);
  });
  await saveDb();
}

export async function createRelationship(
  personId: string,
  relatedToId: string,
  relType: RelationshipType,
  isPrimary = false,
): Promise<Relationship> {
  const db = await getDb();
  const rel: Relationship = {
    id: uuidv4(),
    person_id: personId,
    related_to_id: relatedToId,
    rel_type: relType,
    is_primary: isPrimary,
  };
  db.run(insertRelationshipSql(rel));
  await saveDb();
  return rel;
}

export async function getAllRelationships(): Promise<Relationship[]> {
  const db = await getDb();
  return mapRows<Relationship>(db, "SELECT * FROM relationships");
}

/**
 * Xóa toàn bộ dữ liệu và tạo gia đình mẫu 4 thế hệ.
 * GEN1: Ông bà nội/ngoại
 * GEN2: Cha mẹ, Cô chú bác
 * GEN3: Anchor (An), Vợ (Linh), Em gái (Mai), Anh họ
 * GEN4: Các con, các cháu
 */
export async function seedDemoData(): Promise<void> {
  const db = await getDb();

  function p(overrides: Partial<Person> & { first_name: string }): Person {
    return {
      id: uuidv4(),
      gender: "MALE" as const,
      is_living: true,
      is_anchor: false,
      ...overrides,
    };
  }

  // ─── Gen 1: Ông Bà Nội & Ngoại ──────────────────────────────────────────────
  const ongNoi = p({ first_name: "Bình", last_name: "Nguyễn", middle_name: "Văn", gender: "MALE", is_living: false, birth_year: 1938 });
  const baNoi = p({ first_name: "Lan", last_name: "Trần", middle_name: "Thị", gender: "FEMALE", is_living: false, birth_year: 1942 });
  const ongNgoai = p({ first_name: "Dũng", last_name: "Lê", middle_name: "Văn", gender: "MALE", is_living: true, birth_year: 1944 });
  const baNgoai = p({ first_name: "Phương", last_name: "Võ", middle_name: "Thị", gender: "FEMALE", is_living: true, birth_year: 1948 });

  // ─── Gen 2: Cha mẹ + Cô Chú Bác ──────────────────────────────────────────────
  const cha = p({ first_name: "Hùng", last_name: "Nguyễn", middle_name: "Văn", gender: "MALE", is_living: true, birth_year: 1968 });
  const me = p({ first_name: "Hoa", last_name: "Lê", middle_name: "Thị", gender: "FEMALE", is_living: true, birth_year: 1971 });

  const bacTrai = p({ first_name: "Hải", last_name: "Nguyễn", middle_name: "Văn", gender: "MALE", is_living: true, birth_year: 1965 });
  const diGai = p({ first_name: "Thu", last_name: "Lê", middle_name: "Thị", gender: "FEMALE", is_living: true, birth_year: 1975 });

  // ─── Gen 3: Anchor (An) + Vợ, Em gái, Anh em họ ──────────────────────────────────────────────
  const anchor = p({ first_name: "An", last_name: "Nguyễn", middle_name: "Văn", gender: "MALE", birth_year: 1995, is_anchor: true });
  const vo = p({ first_name: "Linh", last_name: "Phạm", middle_name: "Thùy", gender: "FEMALE", birth_year: 1996 });
  const emGai = p({ first_name: "Mai", last_name: "Nguyễn", middle_name: "Thị", gender: "FEMALE", birth_year: 1998 });
  const anhHo = p({ first_name: "Bảo", last_name: "Nguyễn", middle_name: "Văn", gender: "MALE", birth_year: 1992 }); // Con bác Hải

  // ─── Gen 4: Con cháu ─────────────────────────────────────────────────────────
  const con1 = p({ first_name: "Bo", last_name: "Nguyễn", middle_name: "Văn", gender: "MALE", birth_year: 2022 });
  const chauGai = p({ first_name: "Mít", last_name: "Hoàng", middle_name: "Thị", gender: "FEMALE", birth_year: 2024 }); // Con em Mai

  const allPersons = [ongNoi, baNoi, ongNgoai, baNgoai, cha, me, bacTrai, diGai, anchor, vo, emGai, anhHo, con1, chauGai];

  const insertPerson = (person: Person) => {
    db.run(`INSERT INTO persons (
        id, first_name, last_name, middle_name, gender,
        is_living, birth_year, death_year, phone_number, contact_address,
        biography, notes, is_anchor
      ) VALUES (
        ${escapeSql(person.id)}, ${escapeSql(person.first_name)},
        ${escapeSql(person.last_name)}, ${escapeSql(person.middle_name)},
        ${escapeSql(person.gender)}, ${escapeSql(person.is_living)},
        ${escapeSql(person.birth_year ?? null)}, ${escapeSql(person.death_year ?? null)},
        ${escapeSql(person.phone_number ?? null)}, ${escapeSql(person.contact_address ?? null)},
        ${escapeSql(person.biography ?? null)}, NULL, ${escapeSql(person.is_anchor)}
      )`);
  };

  // Seed là thao tác PHÁ HUỶ: xoá sạch rồi dựng lại. Bọc transaction để một lỗi
  // giữa chừng không để lại cây bị cắt một nửa.
  const insertAll = () => {
    db.run("DELETE FROM relationships");
    db.run("DELETE FROM persons");
    allPersons.forEach(insertPerson);

    const rel = (a: string, b: string, type: string, primary = 1) => {
      db.run(`INSERT INTO relationships (id, person_id, related_to_id, rel_type, is_primary)
        VALUES (${escapeSql(uuidv4())}, ${escapeSql(a)}, ${escapeSql(b)}, ${escapeSql(type)}, ${primary})`);
    };

    // GEN1 vợ chồng nội & ngoại
    rel(ongNoi.id, baNoi.id, "SPOUSE");
    rel(ongNgoai.id, baNgoai.id, "SPOUSE");

    // Ông bà nội → con cái gen2
    rel(ongNoi.id, cha.id, "PARENT_OF");
    rel(baNoi.id, cha.id, "PARENT_OF");
    rel(ongNoi.id, bacTrai.id, "PARENT_OF");
    rel(baNoi.id, bacTrai.id, "PARENT_OF");

    // Ông bà ngoại → Hoa và Dì Thu
    rel(ongNgoai.id, me.id, "PARENT_OF");
    rel(baNgoai.id, me.id, "PARENT_OF");
    rel(ongNgoai.id, diGai.id, "PARENT_OF");
    rel(baNgoai.id, diGai.id, "PARENT_OF");

    // GEN2 vợ chồng
    rel(cha.id, me.id, "SPOUSE");
    rel(anchor.id, vo.id, "SPOUSE");

    // Cha mẹ → con gen3
    rel(cha.id, anchor.id, "PARENT_OF");
    rel(me.id, anchor.id, "PARENT_OF", 0);
    rel(cha.id, emGai.id, "PARENT_OF");
    rel(me.id, emGai.id, "PARENT_OF", 0);

    // Bác Hải → anh họ Bảo
    rel(bacTrai.id, anhHo.id, "PARENT_OF");

    // Anchor → con gen4
    rel(anchor.id, con1.id, "PARENT_OF");
    rel(vo.id, con1.id, "PARENT_OF", 0);

    // Em Mai → cháu gái Mít
    rel(emGai.id, chauGai.id, "PARENT_OF");
  };

  withTransaction(db, insertAll);
  await saveDb();
  console.log("[gia-pha] ✅ Demo seeded: 4 Generation Data.");
}
