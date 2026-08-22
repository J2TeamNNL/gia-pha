/**
 * Migration v0/v1 → v2.
 *
 * Spec: `plans/260821-2350-restructure-v1/migration.md`.
 *
 * Đây là đoạn code duy nhất trong dự án có thể phá dữ liệu thật. Ba tính chất
 * làm nó an toàn, theo thứ tự quan trọng:
 *
 * 1. **Không ghi gì cho tới khi mọi kiểm tra qua.** Trong sql.js đơn vị bền vững
 *    là *khối bytes xuất ra*, không phải transaction SQL. Hàm này chỉ làm việc
 *    trên một `Database` trong bộ nhớ và **trả về** kết quả; caller mới là nơi
 *    quyết định persist. Thất bại = vứt đối tượng trong RAM, bản gốc không hề bị chạm.
 * 2. **Ghi vào KEY IndexedDB MỚI.** Việc đó do `client.ts` làm. Blob v1 nằm
 *    nguyên chỗ code cũ mong đợi, nên một service-worker shell cũ chạy code cũ
 *    không thể nhìn thấy — chứ không chỉ là "tránh" nhìn thấy.
 * 3. **Không xoá gì trước khi ghi lại.** Mọi sửa chữa đều vào `report.repairs`,
 *    và mọi thứ không suy được đều vào `report.reviewList` để hỏi người dùng.
 *
 * Hai sự thật về pragma, đã kiểm chứng ở wasm 3.49.1, quyết định cấu trúc hàm này:
 * - `PRAGMA foreign_keys` **reset về 0 ở mỗi connection mới**.
 * - `PRAGMA foreign_keys` **bên trong transaction là no-op** → phải đặt TRƯỚC
 *   `BEGIN`, khôi phục SAU `COMMIT`. Vì vậy: pragma-rồi-transaction, không phải
 *   transaction-rồi-pragma.
 */
import { initDatabaseSchema as normalizeToV1 } from "./schema";
import {
  SCHEMA_VERSION_V2,
  createV2Schema,
  enableForeignKeys,
  getUserVersion,
} from "./schema-v2";

type Db = import("sql.js").Database;
type SqlValue = string | number | Uint8Array | null;

/** Một lần sửa chữa dữ liệu hỏng. Không có gì bị bỏ đi mà không có dòng ở đây. */
export interface RepairEntry {
  step: string;
  detail: string;
  rows: number;
}

/**
 * Một điều KHÔNG suy ra được từ dữ liệu cũ. Đây là danh sách người dùng phải tự
 * quyết — đoán hộ họ là cách sinh ra dữ liệu sai mà không ai biết.
 */
export interface ReviewItem {
  kind:
    | "MARRIAGE_ORDER_UNKNOWN"
    | "CHILD_UNION_UNKNOWN"
    | "LUNAR_DEATH_TEXT"
    | "PHONE_UNPARSEABLE"
    | "NAME_MISSING"
    | "DATE_DROPPED"
    | "CYCLE_BROKEN";
  personId?: string;
  detail: string;
}

export interface MigrationReport {
  fromVersion: number;
  toVersion: number;
  counts: {
    personsBefore: number;
    relationshipsBefore: number;
    personsAfter: number;
    unionsAfter: number;
    parentagesAfter: number;
    dateFactsAfter: number;
  };
  repairs: RepairEntry[];
  reviewList: ReviewItem[];
}

export class MigrationError extends Error {
  readonly report: Partial<MigrationReport>;
  constructor(message: string, report: Partial<MigrationReport> = {}) {
    super(message);
    this.name = "MigrationError";
    this.report = report;
  }
}

// ── tiện ích SQL ──────────────────────────────────────────────────────────────

function rows(db: Db, sql: string): SqlValue[][] {
  const res = db.exec(sql);
  return res.length ? res[0].values : [];
}

function count(db: Db, sql: string): number {
  const r = rows(db, sql);
  return r.length ? Number(r[0][0]) : 0;
}

function quote(v: unknown): string {
  if (v === null || v === undefined || v === "") return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

/** id ổn định, không cần `crypto` — migration phải chạy được cả trong Node test. */
function makeId(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(6, "0")}`;
}

// ── chuẩn hoá giá trị ─────────────────────────────────────────────────────────

const GENDERS = new Set(["MALE", "FEMALE", "OTHER", "UNKNOWN"]);

/**
 * DDL cũ mặc định `'MALE'` và cho cả NULL lẫn `'male'`. Giới tính quyết định
 * bác/chú/cô vs cậu/dì, nên đoán sai là sinh ra xưng hô sai một cách im lặng.
 * **Không bao giờ đoán** — không nhận ra thì trả `UNKNOWN`.
 */
function normalizeGender(raw: SqlValue): string {
  if (typeof raw !== "string") return "UNKNOWN";
  const up = raw.trim().toUpperCase();
  return GENDERS.has(up) ? up : "UNKNOWN";
}

/**
 * `'0912345678'` → `'+84912345678'`. CHECK của v2 bắt buộc dạng `+<số>`.
 * Không parse được thì trả `null` và **giữ nguyên bản gốc trong notes** — số điện
 * thoại người thân là dữ liệu không tạo lại được, không được im lặng vứt đi.
 */
export function normalizePhone(raw: SqlValue): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[\s.\-()]/g, "");
  if (cleaned === "") return null;
  if (/^\+\d{6,15}$/.test(cleaned)) return cleaned;
  if (/^0\d{8,10}$/.test(cleaned)) return `+84${cleaned.slice(1)}`;
  if (/^84\d{8,10}$/.test(cleaned)) return `+${cleaned}`;
  return null;
}

/** `'2026-03-12 08:30:00'` → `'2026-03-12T08:30:00Z'`. Không parse được thì `null`. */
function toIsoTimestamp(raw: SqlValue): string | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const m = raw.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  if (m) return `${m[1]}T${m[2]}Z`;
  if (/^\d{4}-\d{2}-\d{2}T.*Z$/.test(raw.trim())) return raw.trim();
  return null;
}

const num = (v: SqlValue): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const text = (v: SqlValue): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};

/**
 * `precision` suy từ chỗ nào có dữ liệu. Trả `null` nếu tổ hợp không thành một
 * ngày hợp lệ (ví dụ chỉ có ngày mà không có tháng) — caller sẽ bỏ và ghi report.
 */
function inferPrecision(
  year: number | null,
  month: number | null,
  day: number | null,
): "EXACT" | "MONTH_ONLY" | "YEAR_ONLY" | null {
  if (month !== null && day !== null) return "EXACT";
  if (month !== null && day === null) return "MONTH_ONLY";
  if (year !== null && month === null && day === null) return "YEAR_ONLY";
  return null; // ngày-không-tháng, hoặc rỗng hoàn toàn
}

// ── các pass ──────────────────────────────────────────────────────────────────

const V1_TRIGGERS = [
  "trg_rel_no_cycle_insert",
  "trg_rel_no_cycle_update",
  "trg_rel_person_exists_insert",
  "trg_rel_person_exists_update",
  "trg_person_delete_guard",
  "trg_rel_no_self_insert",
  "trg_rel_no_self_update",
];

const VALID_REL_TYPES = ["PARENT_OF", "ADOPTED_PARENT_OF", "SPOUSE", "EX_SPOUSE"];
const PARENT_REL_TYPES = ["PARENT_OF", "ADOPTED_PARENT_OF"];

/** Pass 1 — sửa chữa. Không xoá gì mà không ghi vào `repairs` trước. */
function repairLegacy(db: Db, repairs: RepairEntry[]): void {
  const record = (step: string, detail: string, sql: string) => {
    const n = count(db, `SELECT count(*) FROM relationships WHERE ${sql}`);
    if (n > 0) {
      db.run(`DELETE FROM relationships WHERE ${sql}`);
      repairs.push({ step, detail, rows: n });
    }
  };

  // R1 — rel_type ngoài enum. `'PARNET_OF'` đã kiểm chứng là chèn được ở v1; mọi
  // reader lọc nó ra nên cạnh vô hình mà vẫn tồn tại.
  record(
    "R1",
    "cạnh có rel_type ngoài enum (vô hình với mọi reader nhưng vẫn nằm trong DB)",
    `rel_type NOT IN (${VALID_REL_TYPES.map(quote).join(",")})`,
  );

  // R2/R3 — orphan edge và self-edge: `normalizeToV1()` đã CÁCH LY sang
  // relationships_quarantine trước khi tới đây, nên chỉ cần ghi nhận số lượng.
  const quarantined = count(
    db,
    "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='relationships_quarantine'",
  )
    ? count(db, "SELECT count(*) FROM relationships_quarantine")
    : 0;
  if (quarantined > 0) {
    repairs.push({
      step: "R2/R3",
      detail: "orphan edge + tự-trỏ-vào-mình đã được cách ly ở bước chuẩn hoá v1",
      rows: quarantined,
    });
  }

  // R4 — SPOUSE hai chiều. QuickAddForm ghi cả hai chiều, seed ghi một chiều;
  // reader coi SPOUSE là vô hướng nên vợ/chồng quay lại hai lần.
  const dupSpouse = count(
    db,
    `SELECT count(*) FROM relationships r WHERE r.rel_type IN ('SPOUSE','EX_SPOUSE') AND EXISTS (
       SELECT 1 FROM relationships o
        WHERE o.rel_type = r.rel_type
          AND o.person_id = r.related_to_id AND o.related_to_id = r.person_id
          AND o.rowid < r.rowid)`,
  );
  if (dupSpouse > 0) {
    db.run(
      `DELETE FROM relationships WHERE rowid IN (
         SELECT r.rowid FROM relationships r
          WHERE r.rel_type IN ('SPOUSE','EX_SPOUSE') AND EXISTS (
            SELECT 1 FROM relationships o
             WHERE o.rel_type = r.rel_type
               AND o.person_id = r.related_to_id AND o.related_to_id = r.person_id
               AND o.rowid < r.rowid))`,
    );
    repairs.push({
      step: "R4",
      detail: "cạnh SPOUSE ghi hai chiều — gộp về một chiều chuẩn",
      rows: dupSpouse,
    });
  }

  // R5 — trùng (parent, child). PK mới `(child_id, parent_id)` cấm.
  const dupParent = count(
    db,
    `SELECT count(*) FROM relationships r WHERE r.rel_type IN (${PARENT_REL_TYPES.map(quote).join(",")})
       AND EXISTS (SELECT 1 FROM relationships o
                    WHERE o.rel_type IN (${PARENT_REL_TYPES.map(quote).join(",")})
                      AND o.person_id = r.person_id AND o.related_to_id = r.related_to_id
                      AND o.rowid < r.rowid)`,
  );
  if (dupParent > 0) {
    db.run(
      `DELETE FROM relationships WHERE rowid IN (
         SELECT r.rowid FROM relationships r
          WHERE r.rel_type IN (${PARENT_REL_TYPES.map(quote).join(",")})
            AND EXISTS (SELECT 1 FROM relationships o
                         WHERE o.rel_type IN (${PARENT_REL_TYPES.map(quote).join(",")})
                           AND o.person_id = r.person_id AND o.related_to_id = r.related_to_id
                           AND o.rowid < r.rowid))`,
    );
    repairs.push({ step: "R5", detail: "cạnh cha-con trùng lặp", rows: dupParent });
  }

  // R6 — nhiều anchor. Index unique từng phần của v2 cấm; giữ rowid nhỏ nhất.
  const anchors = count(db, "SELECT count(*) FROM persons WHERE is_anchor = 1");
  if (anchors > 1) {
    db.run(
      "UPDATE persons SET is_anchor = 0 WHERE rowid <> (SELECT min(rowid) FROM persons WHERE is_anchor = 1)",
    );
    repairs.push({
      step: "R6",
      detail: `có ${anchors} người được đánh dấu "tôi" — giữ người được tạo sớm nhất`,
      rows: anchors - 1,
    });
  }
  db.run("UPDATE persons SET is_anchor = 0 WHERE is_anchor IS NULL OR is_anchor NOT IN (0,1)");
}

/**
 * Pass 1b — cắt chu trình tổ tiên.
 *
 * Một cạnh `cha p → con c` là cạnh-đóng-vòng khi `p` đến được từ `c` theo hướng
 * hậu duệ. Xoá cạnh có **rowid lớn nhất** trong số đó (mới nhất = nhiều khả năng
 * là lỗi nhập nhất), rồi lặp lại.
 *
 * Xoá TẤT CẢ cạnh đóng vòng trong một lượt là sai: trên chu trình 4 cạnh thì cả
 * 4 đều thoả điều kiện, nên một lượt sẽ phá 3 quan hệ hợp lệ.
 */
function breakCycles(db: Db, repairs: RepairEntry[], review: ReviewItem[]): void {
  const parentTypes = PARENT_REL_TYPES.map(quote).join(",");
  const maxIterations = count(db, `SELECT count(*) FROM relationships WHERE rel_type IN (${parentTypes})`);

  let broken = 0;
  for (let i = 0; i < maxIterations + 1; i++) {
    const found = rows(
      db,
      `SELECT r.rowid, r.person_id, r.related_to_id FROM relationships r
        WHERE r.rel_type IN (${parentTypes})
          AND EXISTS (
            WITH RECURSIVE desc_of(id) AS (
              SELECT r.related_to_id
              UNION
              SELECT c.related_to_id FROM relationships c JOIN desc_of ON c.person_id = desc_of.id
               WHERE c.rel_type IN (${parentTypes})
            )
            SELECT 1 FROM desc_of WHERE id = r.person_id)
        ORDER BY r.rowid DESC LIMIT 1`,
    );
    if (found.length === 0) break;

    const [rowid, parentId, childId] = found[0];
    db.run(`DELETE FROM relationships WHERE rowid = ${Number(rowid)}`);
    broken++;
    review.push({
      kind: "CYCLE_BROKEN",
      personId: String(childId),
      detail: `cạnh cha-con ${String(parentId)} → ${String(childId)} tạo thành chu trình tổ tiên nên đã bị gỡ. Hãy kiểm tra lại quan hệ này.`,
    });
  }

  if (broken > 0) {
    repairs.push({
      step: "R1b",
      detail: "cạnh cha-con đóng vòng tổ tiên (gỡ từng cạnh mới nhất một, không gỡ hàng loạt)",
      rows: broken,
    });
  }
}

/** Pass 2 — biến đổi sang v2. */
function transform(db: Db, review: ReviewItem[]): void {
  // RENAME trước khi bảng v2 nào tồn tại, để cơ chế viết-lại-tham-chiếu của
  // SQLite khi RENAME không thò được vào DDL v2.
  db.run("ALTER TABLE persons RENAME TO legacy_persons");
  createV2Schema(db);

  // ── persons ────────────────────────────────────────────────────────────────
  const legacyCols = new Set(
    rows(db, "PRAGMA table_xinfo(legacy_persons)").map((r) => String(r[1])),
  );
  const col = (name: string) => (legacyCols.has(name) ? name : "NULL");
  const personRows = rows(
    db,
    `SELECT id, ${col("first_name")}, ${col("last_name")}, ${col("middle_name")},
            ${col("title_prefix")}, ${col("gender")}, ${col("is_living")}, ${col("is_anchor")},
            ${col("phone_number")}, ${col("contact_address")}, ${col("zalo_link")},
            ${col("fb_link")}, ${col("avatar_url")}, ${col("biography")}, ${col("notes")},
            ${col("burial_location")}, ${col("death_lunar")},
            ${col("birth_year")}, ${col("birth_month")}, ${col("birth_day")},
            ${col("death_year")}, ${col("death_month")}, ${col("death_day")},
            ${col("created_at")}, ${col("updated_at")}
       FROM legacy_persons`,
  );

  let dateFactSeq = 0;
  for (const r of personRows) {
    const [
      id, firstName, lastName, middleName, titlePrefix, gender, isLiving, isAnchor,
      phoneRaw, address, zalo, fb, avatar, biography, notesRaw, burial, deathLunar,
      by, bm, bd, dy, dm, dd, createdAt, updatedAt,
    ] = r;

    const givenName = text(firstName);
    const familyName = text(lastName);
    const middle = text(middleName);
    const notesParts: string[] = [];
    const existingNotes = text(notesRaw);
    if (existingNotes) notesParts.push(existingNotes);

    // Số điện thoại không parse được: giữ nguyên trong notes, đưa vào danh sách hỏi.
    const phone = normalizePhone(phoneRaw);
    const phoneOriginal = text(phoneRaw);
    if (phone === null && phoneOriginal) {
      notesParts.push(`Số điện thoại chưa chuẩn hoá được: ${phoneOriginal}`);
      review.push({
        kind: "PHONE_UNPARSEABLE",
        personId: String(id),
        detail: `Số "${phoneOriginal}" không đưa được về dạng +84. Đã giữ trong ghi chú.`,
      });
    }

    // `death_lunar` là text tự do. KHÔNG parse — luật bất biến #7: lưu đúng lịch
    // gia đình khai, không convert rồi coi kết quả là gốc.
    const lunar = text(deathLunar);
    if (lunar) {
      notesParts.push(`Ngày mất âm lịch (ghi tay): ${lunar}`);
      review.push({
        kind: "LUNAR_DEATH_TEXT",
        personId: String(id),
        detail: `Ngày mất âm lịch đang là chữ tự do: "${lunar}". Hãy nhập lại thành ngày giỗ có tháng/ngày để app nhắc được.`,
      });
    }

    // Không còn mảnh tên nào: đặt một chỗ trống CÓ ĐÁNH DẤU, không bịa tên.
    let displayNameVi: string | null = null;
    if (!givenName && !familyName && !middle) {
      displayNameVi = "(chưa rõ tên)";
      review.push({
        kind: "NAME_MISSING",
        personId: String(id),
        detail: "Người này không có mảnh tên nào trong dữ liệu cũ.",
      });
    }

    const notes = notesParts.length ? notesParts.join("\n") : null;
    const created = toIsoTimestamp(createdAt);
    const updated = toIsoTimestamp(updatedAt);

    db.run(
      `INSERT INTO persons (id, family_name, middle_name, given_name, title_prefix,
                            display_name_vi, gender, is_living, is_anchor, phone, address,
                            zalo_url, fb_url, avatar_url, biography, notes, burial_place
                            ${created ? ", created_at" : ""}${updated ? ", updated_at" : ""})
       VALUES (${quote(id)}, ${quote(familyName)}, ${quote(middle)}, ${quote(givenName)},
               ${quote(text(titlePrefix))}, ${quote(displayNameVi)}, ${quote(normalizeGender(gender))},
               ${isLiving === null || isLiving === undefined ? "NULL" : Number(isLiving) ? 1 : 0},
               ${Number(isAnchor) === 1 ? 1 : 0}, ${quote(phone)}, ${quote(text(address))},
               ${quote(text(zalo))}, ${quote(text(fb))}, ${quote(text(avatar))},
               ${quote(text(biography))}, ${quote(notes)}, ${quote(text(burial))}
               ${created ? `, ${quote(created)}` : ""}${updated ? `, ${quote(updated)}` : ""})`,
    );

    // date_facts: BIRTH / DEATH từ các cột số. Những cột đó mang ý nghĩa dương lịch.
    for (const [kind, y, m, d] of [
      ["BIRTH", num(by), num(bm), num(bd)],
      ["DEATH", num(dy), num(dm), num(dd)],
    ] as const) {
      if (y === null && m === null && d === null) continue;
      const precision = inferPrecision(y, m, d);
      if (precision === null) {
        // Ngày mà không có tháng không phải là một ngày, và CHECK sẽ từ chối.
        review.push({
          kind: "DATE_DROPPED",
          personId: String(id),
          detail: `${kind === "BIRTH" ? "Ngày sinh" : "Ngày mất"} chỉ có số ngày (${d}) mà không có tháng — không lưu được, đã bỏ. Hãy nhập lại.`,
        });
        continue;
      }
      db.run(
        `INSERT INTO date_facts (id, person_id, kind, calendar, year, month, day, precision)
         VALUES (${quote(makeId("df", ++dateFactSeq))}, ${quote(id)}, ${quote(kind)},
                 'GREGORIAN', ${y ?? "NULL"}, ${m ?? "NULL"}, ${d ?? "NULL"}, ${quote(precision)})`,
      );
    }
  }

  // ── unions từ cạnh vợ/chồng ────────────────────────────────────────────────
  const spouseEdges = rows(
    db,
    `SELECT person_id, related_to_id, rel_type FROM relationships
      WHERE rel_type IN ('SPOUSE','EX_SPOUSE') ORDER BY rowid`,
  );
  /** cặp đã chuẩn hoá `min|max` → union id */
  const unionOfPair = new Map<string, string>();
  /** person id → các union họ tham gia */
  const unionsOfPerson = new Map<string, string[]>();
  let unionSeq = 0;

  for (const [a, b, relType] of spouseEdges) {
    const pair = [String(a), String(b)].sort();
    const key = pair.join("|");
    if (unionOfPair.has(key)) continue;
    const unionId = makeId("un", ++unionSeq);
    unionOfPair.set(key, unionId);
    // Goá KHÔNG suy ra ở đây — nó được suy lúc hiển thị từ is_living của bạn đời.
    db.run(
      `INSERT INTO unions (id, status) VALUES (${quote(unionId)}, ${quote(relType === "EX_SPOUSE" ? "DIVORCED" : "MARRIED")})`,
    );
    for (const personId of pair) {
      const list = unionsOfPerson.get(personId) ?? [];
      list.push(unionId);
      unionsOfPerson.set(personId, list);
    }
  }

  // union_partners: `partner_seq = 1` CHỈ khi người đó có đúng một cuộc hôn nhân.
  // Nhiều cuộc thì để NULL và đưa vào danh sách hỏi — thứ tự vợ cả/vợ hai không
  // suy được từ một danh sách cạnh vô thứ tự.
  for (const [key, unionId] of unionOfPair) {
    for (const personId of key.split("|")) {
      const total = unionsOfPerson.get(personId)?.length ?? 0;
      const seq = total === 1 ? 1 : null;
      db.run(
        `INSERT INTO union_partners (union_id, person_id, partner_seq)
         VALUES (${quote(unionId)}, ${quote(personId)}, ${seq ?? "NULL"})`,
      );
      if (total > 1) {
        review.push({
          kind: "MARRIAGE_ORDER_UNKNOWN",
          personId,
          detail: `Người này có ${total} cuộc hôn nhân nhưng dữ liệu cũ không ghi thứ tự. Hãy chọn đâu là vợ cả / vợ hai…`,
        });
      }
    }
  }

  // ── parentages ─────────────────────────────────────────────────────────────
  const parentEdges = rows(
    db,
    `SELECT person_id, related_to_id, rel_type FROM relationships
      WHERE rel_type IN ('PARENT_OF','ADOPTED_PARENT_OF') ORDER BY rowid`,
  );
  /** con → danh sách cha/mẹ đã ghi nhận */
  const parentsOfChild = new Map<string, string[]>();
  for (const [p, c] of parentEdges) {
    const list = parentsOfChild.get(String(c)) ?? [];
    list.push(String(p));
    parentsOfChild.set(String(c), list);
  }

  const reviewedChildren = new Set<string>();
  for (const [parentRaw, childRaw, relType] of parentEdges) {
    const parentId = String(parentRaw);
    const childId = String(childRaw);
    const others = (parentsOfChild.get(childId) ?? []).filter((p) => p !== parentId);

    // Neo con vào một union CHỈ KHI cha/mẹ kia là bạn đời của ĐÚNG MỘT union với
    // cha/mẹ này. Mọi trường hợp khác ⇒ NULL + confidence UNCERTAIN + hỏi người dùng.
    const candidates = others
      .map((other) => unionOfPair.get([parentId, other].sort().join("|")))
      .filter((u): u is string => Boolean(u));
    const unique = [...new Set(candidates)];
    const unionId = unique.length === 1 ? unique[0] : null;

    if (unionId === null && !reviewedChildren.has(childId)) {
      reviewedChildren.add(childId);
      review.push({
        kind: "CHILD_UNION_UNKNOWN",
        personId: childId,
        detail:
          others.length === 0
            ? "Chỉ ghi nhận một cha/mẹ, nên chưa biết đứa trẻ này thuộc cuộc hôn nhân nào."
            : "Không xác định được đứa trẻ này thuộc cuộc hôn nhân nào trong số các cuộc đã ghi.",
      });
    }

    db.run(
      `INSERT INTO parentages (child_id, parent_id, union_id, kind, confidence)
       VALUES (${quote(childId)}, ${quote(parentId)}, ${quote(unionId)},
               ${quote(relType === "ADOPTED_PARENT_OF" ? "ADOPTIVE" : "BIOLOGICAL")},
               ${quote(unionId === null ? "UNCERTAIN" : "ASSERTED")})`,
    );
  }

  // ── dọn bảng cũ ────────────────────────────────────────────────────────────
  db.run("DROP TABLE relationships");
  db.run("DROP TABLE legacy_persons");
  db.run("DROP TABLE IF EXISTS relationships_quarantine");
}

// ── điểm vào ──────────────────────────────────────────────────────────────────

/**
 * Migrate một DB v0/v1 đang mở trong bộ nhớ sang v2, tại chỗ.
 *
 * KHÔNG persist gì — caller quyết định. Ném lỗi ⇒ đối tượng `db` này phải bị vứt
 * bỏ và bản gốc giữ nguyên.
 *
 * @throws MigrationError nếu hậu kiểm thất bại.
 */
export function migrateToV2(db: Db): MigrationReport {
  const fromVersion = getUserVersion(db);
  if (fromVersion === SCHEMA_VERSION_V2) {
    throw new MigrationError("DB đã ở phiên bản 2 — không migrate lại.");
  }
  if (fromVersion > SCHEMA_VERSION_V2) {
    throw new MigrationError(
      `File ở phiên bản schema ${fromVersion}, bản app này chỉ hiểu tới ${SCHEMA_VERSION_V2}.`,
    );
  }

  // Pass 0 — đưa bảng cũ nửa vời về đúng hình dạng v1 (đã có test riêng, không
  // phá dữ liệu: chỉ ALTER TABLE ADD COLUMN và cách ly row xấu).
  db.run("PRAGMA foreign_keys = OFF");
  normalizeToV1(db);

  const repairs: RepairEntry[] = [];
  const reviewList: ReviewItem[] = [];
  const personsBefore = count(db, "SELECT count(*) FROM persons");
  const relationshipsBefore = count(db, "SELECT count(*) FROM relationships");

  // Trigger của v1 sẽ chặn chính các thao tác sửa chữa bên dưới. Bỏ chúng đi;
  // schema v2 mang bộ ràng buộc riêng và Pass 3 kiểm lại toàn bộ.
  for (const trigger of V1_TRIGGERS) db.run(`DROP TRIGGER IF EXISTS ${trigger}`);

  // FK phải TẮT trước BEGIN — pragma này là no-op bên trong transaction.
  db.run("PRAGMA foreign_keys = OFF");
  db.run("BEGIN IMMEDIATE");
  try {
    repairLegacy(db, repairs);
    breakCycles(db, repairs, reviewList);
    transform(db, reviewList);
    db.run("COMMIT");
  } catch (err) {
    try {
      db.run("ROLLBACK");
    } catch {
      // không có transaction đang mở
    }
    throw new MigrationError(
      `Migration thất bại, dữ liệu gốc không bị chạm: ${(err as Error).message}`,
      { fromVersion, repairs, reviewList },
    );
  }

  db.run(`PRAGMA user_version = ${SCHEMA_VERSION_V2}`);

  const report: MigrationReport = {
    fromVersion,
    toVersion: SCHEMA_VERSION_V2,
    counts: {
      personsBefore,
      relationshipsBefore,
      personsAfter: count(db, "SELECT count(*) FROM persons"),
      unionsAfter: count(db, "SELECT count(*) FROM unions"),
      parentagesAfter: count(db, "SELECT count(*) FROM parentages"),
      dateFactsAfter: count(db, "SELECT count(*) FROM date_facts"),
    },
    repairs,
    reviewList,
  };

  db.run(
    `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('migration_report', ${quote(JSON.stringify(report))})`,
  );

  assertPostConditions(db, report);
  return report;
}

/**
 * Pass 3 — hậu kiểm. Thay cho `isSchemaValid()` cũ: bản cũ dùng kết quả kiểm để
 * **xoá dữ liệu**; bản này chỉ **ném lỗi to** và để caller vứt bản trong RAM.
 */
export function assertPostConditions(db: Db, report: MigrationReport): void {
  enableForeignKeys(db);

  const fkViolations = rows(db, "PRAGMA foreign_key_check");
  if (fkViolations.length > 0) {
    throw new MigrationError(
      `Sau migration còn ${fkViolations.length} vi phạm khoá ngoại.`,
      report,
    );
  }

  const integrity = rows(db, "PRAGMA integrity_check");
  if (String(integrity[0]?.[0]) !== "ok") {
    throw new MigrationError(`integrity_check không sạch: ${String(integrity[0]?.[0])}`, report);
  }

  // Không được mất người nào. Đây là hậu kiểm quan trọng nhất.
  if (report.counts.personsAfter !== report.counts.personsBefore) {
    throw new MigrationError(
      `Số người lệch: trước ${report.counts.personsBefore}, sau ${report.counts.personsAfter}.`,
      report,
    );
  }

  if (count(db, "SELECT count(*) FROM persons WHERE is_anchor = 1") > 1) {
    throw new MigrationError("Còn nhiều hơn một người được đánh dấu là 'tôi'.", report);
  }

  if (getUserVersion(db) !== SCHEMA_VERSION_V2) {
    throw new MigrationError("user_version chưa được dập thành 2.", report);
  }
}
