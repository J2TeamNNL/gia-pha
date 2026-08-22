/**
 * Schema gia phả v1 — DDL, migration cộng thêm, và ràng buộc toàn vẹn.
 *
 * Luật bất biến: KHÔNG BAO GIỜ xoá dữ liệu người dùng để "sửa" schema.
 * Mọi migration ở đây chỉ THÊM (CREATE TABLE / ADD COLUMN / CREATE TRIGGER).
 * Không migrate được thì `throw` để tầng trên báo cho người dùng, không xoá.
 *
 * Danh sách cột là NGUỒN DUY NHẤT: cả CREATE TABLE lẫn ALTER TABLE sinh ra từ nó,
 * nên schema mới và DB cũ đã migrate luôn có cùng hình dạng.
 */
type Db = import("sql.js").Database;

/** Phiên bản schema ghi vào `PRAGMA user_version`. DB cũ (trước v1) mang giá trị 0. */
export const SCHEMA_VERSION = 1;

/** Cột `persons`: tên → định nghĩa. Mọi cột nullable hoặc có DEFAULT nên ADD COLUMN luôn an toàn. */
const PERSON_COLUMNS: Record<string, string> = {
  id: "TEXT PRIMARY KEY",
  first_name: "TEXT NOT NULL",
  last_name: "TEXT",
  middle_name: "TEXT",
  title_prefix: "TEXT",
  gender: "TEXT DEFAULT 'MALE'",
  is_living: "INTEGER DEFAULT 1",
  birth_year: "INTEGER",
  birth_month: "INTEGER",
  birth_day: "INTEGER",
  death_year: "INTEGER",
  death_month: "INTEGER",
  death_day: "INTEGER",
  death_lunar: "TEXT",
  burial_location: "TEXT",
  phone_number: "TEXT",
  contact_address: "TEXT",
  zalo_link: "TEXT",
  fb_link: "TEXT",
  avatar_url: "TEXT",
  biography: "TEXT",
  notes: "TEXT",
  is_anchor: "INTEGER DEFAULT 0",
  created_at: "DATETIME",
  updated_at: "DATETIME",
};

const RELATIONSHIP_COLUMNS: Record<string, string> = {
  id: "TEXT PRIMARY KEY",
  person_id: "TEXT NOT NULL",
  related_to_id: "TEXT NOT NULL",
  rel_type: "TEXT NOT NULL",
  is_primary: "INTEGER DEFAULT 0",
};

/**
 * Tên cột `persons` được phép ghi từ tầng ứng dụng. Sinh từ CHÍNH bảng khai báo
 * cột ở trên, nên không bao giờ lệch với schema thật.
 *
 * Dùng làm allowlist ở `updatePerson`: bản cũ nội suy tên cột trực tiếp từ khoá
 * của object đầu vào, tức tên cột — không phải giá trị — đi thẳng vào câu SQL
 * mà không qua escape nào.
 */
export const WRITABLE_PERSON_COLUMNS: ReadonlySet<string> = new Set(
  Object.keys(PERSON_COLUMNS).filter(
    (c) => c !== "id" && c !== "created_at" && c !== "updated_at",
  ),
);

/** Quan hệ cha–con, dùng chung ở trigger chống chu trình. */
const PARENT_TYPES = "('PARENT_OF','ADOPTED_PARENT_OF')";

/**
 * Bảng cách ly: nơi chứa row quan hệ không thoả ràng buộc (trỏ tới người không
 * tồn tại, hoặc tự trỏ vào mình). Cách ly thay vì DELETE để không mất dữ liệu.
 */
const QUARANTINE_DDL = `
  CREATE TABLE IF NOT EXISTS relationships_quarantine (
    id TEXT,
    person_id TEXT,
    related_to_id TEXT,
    rel_type TEXT,
    is_primary INTEGER,
    reason TEXT,
    quarantined_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

/**
 * Định nghĩa cột dùng cho ALTER TABLE ADD COLUMN. SQLite từ chối thêm cột
 * `NOT NULL` không có DEFAULT vào bảng đã có row, nên ở đường migration ta gắn
 * DEFAULT rỗng. CREATE TABLE của DB mới vẫn giữ NOT NULL nghiêm ngặt.
 */
function alterDef(def: string): string {
  if (!/NOT NULL/i.test(def) || /DEFAULT/i.test(def)) return def;
  return `${def} DEFAULT ''`;
}

function ddl(table: string, columns: Record<string, string>, extra: string[] = []) {
  const cols = Object.entries(columns).map(([name, def]) => `${name} ${def}`);
  return `CREATE TABLE IF NOT EXISTS ${table} (\n  ${[...cols, ...extra].join(",\n  ")}\n);`;
}

/**
 * Trigger ràng buộc. Kiểm chứng ở CẢ host sqlite3 3.51.0 và wasm 3.49.1
 * (recursive CTE trong mệnh đề WHEN chạy được ở cả hai).
 *
 * Thứ tự tạo có ý nghĩa: SQLite bắn trigger theo thứ tự NGƯỢC lúc tạo, nên
 * trigger "tự trỏ vào mình" phải tạo SAU để nó báo lỗi trước trigger chu trình
 * (một cạnh a→a vừa là self vừa là chu trình; thông báo self mới đúng nguyên nhân).
 */
function constraintTriggers(): string[] {
  const cycleCheck = (col: string) => `
    EXISTS (
      WITH RECURSIVE anc(id) AS (
        SELECT NEW.${col}
        UNION
        SELECT r.person_id FROM relationships r JOIN anc ON r.related_to_id = anc.id
          WHERE r.rel_type IN ${PARENT_TYPES}
      )
      SELECT 1 FROM anc WHERE id = NEW.related_to_id
    )`;

  const missingPerson = `(
      NOT EXISTS (SELECT 1 FROM persons WHERE id = NEW.person_id)
      OR NOT EXISTS (SELECT 1 FROM persons WHERE id = NEW.related_to_id)
    )`;

  return [
    `CREATE TRIGGER IF NOT EXISTS trg_rel_no_cycle_insert
     BEFORE INSERT ON relationships
     WHEN NEW.rel_type IN ${PARENT_TYPES} AND ${cycleCheck("person_id")}
     BEGIN SELECT RAISE(ABORT, 'gia-pha: quan hệ cha-con tạo thành chu trình'); END;`,

    `CREATE TRIGGER IF NOT EXISTS trg_rel_no_cycle_update
     BEFORE UPDATE ON relationships
     WHEN NEW.rel_type IN ${PARENT_TYPES} AND ${cycleCheck("person_id")}
     BEGIN SELECT RAISE(ABORT, 'gia-pha: quan hệ cha-con tạo thành chu trình'); END;`,

    // Thay cho FOREIGN KEY: bảng `relationships` của DB v0.x được tạo KHÔNG có
    // mệnh đề FOREIGN KEY, và SQLite không cho ALTER TABLE thêm khoá ngoại. Nếu
    // chỉ dựa vào `PRAGMA foreign_keys = ON` thì DB cũ vẫn chèn được orphan edge.
    // Trigger thì thêm được vào bảng đã tồn tại, nên ràng buộc là NHƯ NHAU cho
    // DB mới và DB cũ, mà không phải dựng lại bảng (tức không phải di chuyển dữ liệu).
    `CREATE TRIGGER IF NOT EXISTS trg_rel_person_exists_insert
     BEFORE INSERT ON relationships
     WHEN ${missingPerson}
     BEGIN SELECT RAISE(ABORT, 'gia-pha: quan hệ trỏ tới người không tồn tại'); END;`,

    `CREATE TRIGGER IF NOT EXISTS trg_rel_person_exists_update
     BEFORE UPDATE ON relationships
     WHEN ${missingPerson}
     BEGIN SELECT RAISE(ABORT, 'gia-pha: quan hệ trỏ tới người không tồn tại'); END;`,

    // Xoá người vẫn còn cạnh sẽ sinh orphan edge. Phải xoá cạnh trước.
    `CREATE TRIGGER IF NOT EXISTS trg_person_delete_guard
     BEFORE DELETE ON persons
     WHEN EXISTS (
       SELECT 1 FROM relationships
       WHERE person_id = OLD.id OR related_to_id = OLD.id
     )
     BEGIN SELECT RAISE(ABORT, 'gia-pha: phải xoá các quan hệ của người này trước'); END;`,

    `CREATE TRIGGER IF NOT EXISTS trg_rel_no_self_insert
     BEFORE INSERT ON relationships
     WHEN NEW.person_id = NEW.related_to_id
     BEGIN SELECT RAISE(ABORT, 'gia-pha: một người không thể có quan hệ với chính mình'); END;`,

    `CREATE TRIGGER IF NOT EXISTS trg_rel_no_self_update
     BEFORE UPDATE ON relationships
     WHEN NEW.person_id = NEW.related_to_id
     BEGIN SELECT RAISE(ABORT, 'gia-pha: một người không thể có quan hệ với chính mình'); END;`,
  ];
}

const INDEX_DDL = [
  "CREATE INDEX IF NOT EXISTS idx_rel_person ON relationships(person_id);",
  "CREATE INDEX IF NOT EXISTS idx_rel_related ON relationships(related_to_id);",
];

/** Lỗi migration: schema trên đĩa không đưa được về v1 mà không phá dữ liệu. */
export class SchemaMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchemaMigrationError";
  }
}

/** Lỗi phiên bản: file do bản app MỚI HƠN ghi ra. Mở là có thể làm hỏng. */
export class SchemaTooNewError extends Error {
  readonly fileVersion: number;
  constructor(fileVersion: number) {
    super(
      `File dữ liệu ở phiên bản schema ${fileVersion}, bản app này chỉ hiểu tới ${SCHEMA_VERSION}. ` +
        `Hãy cập nhật app — không mở để tránh làm hỏng dữ liệu.`,
    );
    this.name = "SchemaTooNewError";
    this.fileVersion = fileVersion;
  }
}

function scalar(db: Db, sql: string): string | number | null {
  const res = db.exec(sql);
  if (!res.length || !res[0].values.length) return null;
  return res[0].values[0][0] as string | number | null;
}

export function getUserVersion(db: Db): number {
  return Number(scalar(db, "PRAGMA user_version") ?? 0);
}

/**
 * Tên cột hiện có của một bảng.
 * LƯU Ý (đã kiểm chứng ở cả hai engine): generated column KHÔNG xuất hiện trong
 * `pragma_table_info`, chỉ trong `table_xinfo`. Dùng `table_xinfo` để không bao
 * giờ "thấy thiếu" một cột đang tồn tại rồi ADD COLUMN trùng tên.
 */
function columnNames(db: Db, table: string): string[] {
  const res = db.exec(`PRAGMA table_xinfo(${table})`);
  if (!res.length) return [];
  return res[0].values.map((row) => String(row[1]));
}

function tableExists(db: Db, table: string): boolean {
  return (
    scalar(
      db,
      `SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${table}'`,
    ) === 1
  );
}

/** Bật ràng buộc khoá ngoại. PHẢI gọi trên MỖI connection — pragma này không nằm trong file. */
export function enableForeignKeys(db: Db): void {
  db.run("PRAGMA foreign_keys = ON");
  if (Number(scalar(db, "PRAGMA foreign_keys") ?? 0) !== 1) {
    throw new SchemaMigrationError(
      "Không bật được PRAGMA foreign_keys — từ chối ghi để tránh sinh dữ liệu rác.",
    );
  }
}

/**
 * Chuyển row quan hệ xấu sang bảng cách ly, để việc bật foreign_keys sau đó
 * không làm mọi lần ghi tiếp theo thất bại. KHÔNG xoá vĩnh viễn.
 * Trả về số row đã cách ly.
 */
function quarantineBadRows(db: Db): number {
  db.run(QUARANTINE_DDL);

  const orphan = `(
    NOT EXISTS (SELECT 1 FROM persons p WHERE p.id = relationships.person_id)
    OR NOT EXISTS (SELECT 1 FROM persons p WHERE p.id = relationships.related_to_id)
  )`;
  const selfRel = "relationships.person_id = relationships.related_to_id";

  const before = Number(scalar(db, "SELECT count(*) FROM relationships") ?? 0);

  db.run(`
    INSERT INTO relationships_quarantine (id, person_id, related_to_id, rel_type, is_primary, reason)
    SELECT id, person_id, related_to_id, rel_type, is_primary,
           CASE WHEN ${selfRel} THEN 'self-relationship' ELSE 'orphan-edge' END
    FROM relationships WHERE ${orphan} OR ${selfRel};
  `);
  db.run(`DELETE FROM relationships WHERE ${orphan} OR ${selfRel};`);

  return before - Number(scalar(db, "SELECT count(*) FROM relationships") ?? 0);
}

export interface SchemaInitResult {
  /** Phiên bản đọc được trước khi migrate. */
  fromVersion: number;
  /** Cột đã thêm bằng ALTER TABLE (không mất dữ liệu). */
  addedColumns: string[];
  /** Số row quan hệ đã chuyển sang bảng cách ly. */
  quarantinedRows: number;
  /** True nếu đây là DB rỗng vừa được tạo. */
  fresh: boolean;
}

/**
 * Đưa DB về schema v1 và bật mọi ràng buộc. Chỉ thêm, không bao giờ xoá.
 *
 * @throws SchemaTooNewError nếu file do bản app mới hơn ghi ra.
 * @throws SchemaMigrationError nếu không migrate được mà không phá dữ liệu.
 */
export function initDatabaseSchema(db: Db): SchemaInitResult {
  const fromVersion = getUserVersion(db);

  if (fromVersion > SCHEMA_VERSION) throw new SchemaTooNewError(fromVersion);

  const fresh = !tableExists(db, "persons") && !tableExists(db, "relationships");
  const addedColumns: string[] = [];

  db.run("BEGIN");
  try {
    db.run(ddl("persons", PERSON_COLUMNS));
    db.run(
      ddl("relationships", RELATIONSHIP_COLUMNS, [
        "FOREIGN KEY(person_id) REFERENCES persons(id)",
        "FOREIGN KEY(related_to_id) REFERENCES persons(id)",
      ]),
    );

    // Migration cộng thêm: bù mọi cột còn thiếu ở DB cũ. Đây là lý do một DB
    // v0.x thiếu cột không còn làm app hỏng vĩnh viễn nữa.
    for (const [table, columns] of [
      ["persons", PERSON_COLUMNS],
      ["relationships", RELATIONSHIP_COLUMNS],
    ] as const) {
      const existing = new Set(columnNames(db, table));
      for (const [name, def] of Object.entries(columns)) {
        if (existing.has(name)) continue;
        if (/PRIMARY KEY/i.test(def)) {
          throw new SchemaMigrationError(
            `Bảng ${table} thiếu cột khoá chính "${name}" — không thêm được mà không tạo lại bảng. Dừng, không xoá gì. Hãy export file dữ liệu ra để cứu thủ công.`,
          );
        }
        // ADD COLUMN yêu cầu cột nullable hoặc có DEFAULT — alterDef() bảo đảm.
        db.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${alterDef(def)}`);
        addedColumns.push(`${table}.${name}`);
      }
    }

    for (const stmt of INDEX_DDL) db.run(stmt);
    const quarantinedRows = quarantineBadRows(db);
    for (const stmt of constraintTriggers()) db.run(stmt);

    db.run("COMMIT");
    // PRAGMA user_version không chạy trong transaction ở mọi engine → để ngoài.
    db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`);

    return { fromVersion, addedColumns, quarantinedRows, fresh };
  } catch (err) {
    try {
      db.run("ROLLBACK");
    } catch {
      // Không có transaction đang mở — bỏ qua.
    }
    throw err;
  }
}

/**
 * Kiểm tra nhanh: DB có đúng hình dạng v1 không (mọi cột, cả hai bảng).
 * Chỉ dùng để KIỂM CHỨNG (ví dụ verify file import), KHÔNG bao giờ dùng làm
 * điều kiện để xoá dữ liệu.
 */
export function isSchemaValid(db: Db): boolean {
  try {
    for (const [table, columns] of [
      ["persons", PERSON_COLUMNS],
      ["relationships", RELATIONSHIP_COLUMNS],
    ] as const) {
      if (!tableExists(db, table)) return false;
      const existing = new Set(columnNames(db, table));
      if (!Object.keys(columns).every((c) => existing.has(c))) return false;
    }
    return true;
  } catch {
    return false;
  }
}
