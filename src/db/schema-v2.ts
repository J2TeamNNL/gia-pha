/**
 * Schema v2 — 6 bảng.
 *
 * Spec: `plans/260821-2350-restructure-v1/proposal-data-model.md`.
 * Khác spec ở một điểm có chủ ý: **không tạo `relationship_overrides`** — roadmap
 * xếp bảng đó cùng engine xưng hô ở Phase 5. Ở đây chỉ có những bảng mà bản thân
 * migration cần.
 *
 * Vì sao v2 (tóm tắt những gì v1 KHÔNG diễn đạt được):
 * - **`unions` + `union_partners`**: một cạnh SPOUSE phẳng không nói được đứa con
 *   nào thuộc bà nào. Đây là yêu cầu được lặp lại nhiều nhất trong nghiên cứu người
 *   dùng, và là bug mà đối thủ trả phí vẫn đang ship.
 * - **`parentages.union_id`**: chỗ neo đứa con vào ĐÚNG cuộc hôn nhân.
 * - **`date_facts`**: 5 loại ngày × 7 thuộc tính (lịch, y/m/d, nhuận, độ chính xác,
 *   độ tin cậy). Nhét vào cột phẳng = 35 cột và 6 CHECK lặp 5 lần.
 * - **`is_living` tri-state** và **`gender DEFAULT 'UNKNOWN'`**: v1 mặc định `MALE`
 *   và cho NULL, mà giới tính quyết định bác/chú/cô vs cậu/dì — đoán sai là sinh ra
 *   xưng hô sai một cách im lặng.
 *
 * Tên cột đổi: `first_name`→`given_name`, `last_name`→`family_name`. Trong tiếng
 * Việt "tên" đứng CUỐI, nên `first_name` là tên gọi gây hiểu nhầm chủ động.
 */
type Db = import("sql.js").Database;

/** `PRAGMA user_version` của model này. v0/v1 mang giá trị 0 hoặc 1. */
export const SCHEMA_VERSION_V2 = 2;

const PERSONS_DDL = `
CREATE TABLE persons (
  id                TEXT PRIMARY KEY,
  family_name       TEXT,
  middle_name       TEXT,
  given_name        TEXT,
  nickname          TEXT,
  title_prefix      TEXT,
  display_name_vi   TEXT,
  display_name_en   TEXT,
  gender            TEXT    NOT NULL DEFAULT 'UNKNOWN'
                    CHECK (gender IN ('MALE','FEMALE','OTHER','UNKNOWN')),
  is_living         INTEGER CHECK (is_living IS NULL OR is_living IN (0,1)),
  is_anchor         INTEGER NOT NULL DEFAULT 0 CHECK (is_anchor IN (0,1)),
  occupation        TEXT,
  avatar_url        TEXT,
  phone             TEXT    CHECK (phone IS NULL OR phone GLOB '+[0-9]*'),
  email             TEXT    CHECK (email IS NULL OR email LIKE '%_@_%.__%'),
  fb_url            TEXT,
  zalo_url          TEXT,
  address           TEXT,
  address_lat       REAL    CHECK (address_lat IS NULL OR address_lat BETWEEN -90 AND 90),
  address_lng       REAL    CHECK (address_lng IS NULL OR address_lng BETWEEN -180 AND 180),
  burial_place      TEXT,
  burial_lat        REAL    CHECK (burial_lat IS NULL OR burial_lat BETWEEN -90 AND 90),
  burial_lng        REAL    CHECK (burial_lng IS NULL OR burial_lng BETWEEN -180 AND 180),
  biography         TEXT,
  notes             TEXT,
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  -- Phải còn ÍT NHẤT một mảnh tên hiển thị được. Ca thật: "Bà Võ Văn Mượng" —
  -- người vợ chỉ được ghi theo tên chồng. Bắt buộc given_name sẽ ép bịa ra tên.
  CHECK (coalesce(family_name, middle_name, given_name, nickname, display_name_vi) IS NOT NULL),
  CHECK ((address_lat IS NULL) = (address_lng IS NULL)),
  CHECK ((burial_lat  IS NULL) = (burial_lng  IS NULL))
);`;

const UNIONS_DDL = `
CREATE TABLE unions (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL DEFAULT 'MARRIAGE'
             CHECK (kind IN ('MARRIAGE','PARTNERSHIP','UNKNOWN')),
  -- WIDOWED khác DIVORCED. Lưu tường minh chứ không chỉ suy ra, vì cách suy
  -- "MARRIED và bạn đời đã mất" bỏ sót ca phổ biến: cái chết chưa từng được ghi.
  status     TEXT NOT NULL DEFAULT 'MARRIED'
             CHECK (status IN ('MARRIED','DIVORCED','WIDOWED','SEPARATED','UNKNOWN')),
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);`;

/**
 * `partner_seq` = thứ hạng cuộc hôn nhân này TRONG SỐ các cuộc của CHÍNH người đó.
 * Ông có 3 bà mang seq 1/2/3 trên BA dòng của ÔNG (vợ cả / vợ hai / vợ ba); mỗi bà
 * mang seq 1 trên dòng của chính bà. Đa phu là cùng cơ chế, đổi vai.
 * **Không chỗ nào đọc giới tính** — nên đồ thị không thể hỏng vì một giả định giới.
 */
const UNION_PARTNERS_DDL = `
CREATE TABLE union_partners (
  union_id    TEXT NOT NULL REFERENCES unions(id)  ON DELETE CASCADE,
  person_id   TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  partner_seq INTEGER CHECK (partner_seq IS NULL OR partner_seq >= 1),
  PRIMARY KEY (union_id, person_id)
);`;

const PARENTAGES_DDL = `
CREATE TABLE parentages (
  child_id            TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  parent_id           TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  -- NULL = "không rõ cuộc hôn nhân nào sinh ra đứa trẻ này". Xoá một union KHÔNG
  -- được xoá con, nên SET NULL chứ không CASCADE.
  union_id            TEXT          REFERENCES unions(id)  ON DELETE SET NULL,
  kind                TEXT NOT NULL DEFAULT 'BIOLOGICAL'
                      CHECK (kind IN ('BIOLOGICAL','ADOPTIVE','STEP','GUARDIAN','CLAIMED')),
  sibling_order       INTEGER CHECK (sibling_order IS NULL OR sibling_order >= 1),
  -- con thừa tự: cháu được nhận nuôi để nối dõi một chi tuyệt tự vẫn giữ cạnh cha
  -- ruột, nhưng thuộc về chi cha nuôi về mặt tông pháp. Cột kind không diễn đạt được
  -- (cả hai cạnh đều chính danh), nên cần cờ riêng chỉ ra cạnh nào định nghĩa chi.
  is_lineage          INTEGER NOT NULL DEFAULT 0 CHECK (is_lineage IN (0,1)),
  effective_from_year INTEGER,
  effective_to_year   INTEGER,
  confidence          TEXT NOT NULL DEFAULT 'ASSERTED'
                      CHECK (confidence IN ('CERTAIN','ASSERTED','UNCERTAIN')),
  source              TEXT,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (child_id, parent_id),
  CHECK (child_id <> parent_id),
  CHECK (effective_to_year IS NULL OR effective_from_year IS NULL
         OR effective_to_year >= effective_from_year)
);`;

const DATE_FACTS_DDL = `
CREATE TABLE date_facts (
  id            TEXT PRIMARY KEY,
  person_id     TEXT REFERENCES persons(id) ON DELETE CASCADE,
  union_id      TEXT REFERENCES unions(id)  ON DELETE CASCADE,
  kind          TEXT NOT NULL
                CHECK (kind IN ('BIRTH','DEATH','MEMORIAL','UNION_START','UNION_END')),
  calendar      TEXT NOT NULL DEFAULT 'GREGORIAN'
                CHECK (calendar IN ('LUNAR_VN','GREGORIAN','UNKNOWN')),
  year          INTEGER,
  month         INTEGER CHECK (month IS NULL OR month BETWEEN 1 AND 12),
  day           INTEGER CHECK (day IS NULL OR day BETWEEN 1 AND 31),
  is_leap_month INTEGER NOT NULL DEFAULT 0 CHECK (is_leap_month IN (0,1)),
  precision     TEXT NOT NULL DEFAULT 'EXACT'
                CHECK (precision IN ('EXACT','MONTH_ONLY','YEAR_ONLY','APPROXIMATE')),
  confidence    TEXT NOT NULL DEFAULT 'ASSERTED'
                CHECK (confidence IN ('CERTAIN','ASSERTED','UNCERTAIN')),
  source        TEXT,
  -- ĐÚNG một chủ sở hữu, nên cả hai FK đều là FK thật.
  CHECK ((person_id IS NOT NULL) <> (union_id IS NOT NULL)),
  CHECK ((kind IN ('BIRTH','DEATH','MEMORIAL')  AND person_id IS NOT NULL)
      OR (kind IN ('UNION_START','UNION_END')   AND union_id  IS NOT NULL)),
  CHECK (is_leap_month = 0 OR calendar = 'LUNAR_VN'),
  CHECK (calendar <> 'LUNAR_VN' OR day IS NULL OR day <= 30),
  -- Ngày giỗ thường chỉ có tháng+ngày, KHÔNG có năm — nên không bắt buộc year.
  CHECK (year IS NOT NULL OR month IS NOT NULL),
  CHECK (precision <> 'MONTH_ONLY' OR day IS NULL),
  CHECK (precision <> 'YEAR_ONLY'  OR (month IS NULL AND day IS NULL))
);`;

/**
 * Sự thật của GIA ĐÌNH, không phải tuỳ chọn của thiết bị — phải sống sót khi khôi
 * phục từ Drive sang máy khác, nên nằm trong file chứ không nằm ở localStorage.
 */
const APP_SETTINGS_DDL = `
CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`;

const INDEXES = [
  // Đúng MỘT người là "tôi". Partial unique index làm việc có 2 anchor trở thành
  // bất khả thi ở tầng DB (v1 chỉ dựa vào UPDATE hai câu không transaction).
  "CREATE UNIQUE INDEX ux_persons_single_anchor ON persons(is_anchor) WHERE is_anchor = 1;",
  "CREATE INDEX idx_persons_name  ON persons(family_name, given_name);",
  "CREATE INDEX idx_persons_given ON persons(given_name);",
  "CREATE INDEX idx_union_partners_person ON union_partners(person_id);",
  // Chặn hai cuộc hôn nhân cùng nhận là "vợ hai". SQLite coi các NULL là khác
  // nhau, nên "chưa rõ thứ tự" vẫn biểu diễn được — bắt buộc, vì thứ tự cưới
  // thường thiếu từ đời 3 trở lên.
  "CREATE UNIQUE INDEX ux_union_partners_seq ON union_partners(person_id, partner_seq);",
  "CREATE INDEX idx_parentages_parent ON parentages(parent_id);",
  "CREATE INDEX idx_parentages_union  ON parentages(union_id);",
  "CREATE INDEX idx_parentages_order  ON parentages(parent_id, sibling_order);",
  "CREATE UNIQUE INDEX ux_parentages_lineage ON parentages(child_id) WHERE is_lineage = 1;",
  "CREATE UNIQUE INDEX ux_date_facts_person ON date_facts(person_id, kind) WHERE person_id IS NOT NULL;",
  "CREATE UNIQUE INDEX ux_date_facts_union  ON date_facts(union_id,  kind) WHERE union_id  IS NOT NULL;",
  "CREATE INDEX idx_date_facts_recurring ON date_facts(kind, month, day);",
];

const TRIGGERS = [
  // Bất biến "một cuộc hôn nhân có tối đa 2 người" — bằng trigger, không bằng quy ước.
  `CREATE TRIGGER trg_union_partners_max2 BEFORE INSERT ON union_partners
   WHEN (SELECT count(*) FROM union_partners WHERE union_id = NEW.union_id) >= 2
   BEGIN SELECT RAISE(ABORT,'gia-pha: một cuộc hôn nhân chỉ có 2 người'); END;`,

  // UNION (không phải UNION ALL) làm CTE dừng kể cả khi dữ liệu đã có sẵn chu trình.
  `CREATE TRIGGER trg_parentage_no_cycle_ins BEFORE INSERT ON parentages
   WHEN EXISTS (
     WITH RECURSIVE anc(id) AS (
       SELECT NEW.parent_id
       UNION
       SELECT p.parent_id FROM parentages p JOIN anc ON p.child_id = anc.id
     )
     SELECT 1 FROM anc WHERE id = NEW.child_id
   )
   BEGIN SELECT RAISE(ABORT,'gia-pha: quan hệ cha-con tạo thành chu trình'); END;`,

  `CREATE TRIGGER trg_parentage_no_cycle_upd BEFORE UPDATE OF child_id, parent_id ON parentages
   WHEN EXISTS (
     WITH RECURSIVE anc(id) AS (
       SELECT NEW.parent_id
       UNION
       SELECT p.parent_id FROM parentages p
         JOIN anc ON p.child_id = anc.id
        WHERE NOT (p.child_id = OLD.child_id AND p.parent_id = OLD.parent_id)
     )
     SELECT 1 FROM anc WHERE id = NEW.child_id
   )
   BEGIN SELECT RAISE(ABORT,'gia-pha: sửa quan hệ cha-con sẽ tạo chu trình'); END;`,
];

/** Mọi câu DDL của v2, đúng thứ tự tạo. */
export function v2DdlStatements(): string[] {
  return [
    PERSONS_DDL,
    UNIONS_DDL,
    UNION_PARTNERS_DDL,
    PARENTAGES_DDL,
    DATE_FACTS_DDL,
    APP_SETTINGS_DDL,
    ...INDEXES,
    ...TRIGGERS,
  ];
}

/** Dựng schema v2 trên một DB TRỐNG. Không migrate gì — xem `migrate-v2.ts`. */
export function createV2Schema(db: Db): void {
  for (const stmt of v2DdlStatements()) db.run(stmt);
}

export const V2_TABLES = [
  "persons",
  "unions",
  "union_partners",
  "parentages",
  "date_facts",
  "app_settings",
] as const;

/** Bật khoá ngoại. PHẢI gọi trên MỖI connection — pragma này không nằm trong file. */
export function enableForeignKeys(db: Db): void {
  db.run("PRAGMA foreign_keys = ON");
}

export function getUserVersion(db: Db): number {
  const res = db.exec("PRAGMA user_version");
  return res.length ? Number(res[0].values[0][0]) : 0;
}

/** Đủ hình dạng v2 chưa. Chỉ dùng để KIỂM CHỨNG, không bao giờ làm cớ để xoá. */
export function isV2Schema(db: Db): boolean {
  try {
    const res = db.exec(
      `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${V2_TABLES.map((t) => `'${t}'`).join(",")})`,
    );
    const found = new Set(res.length ? res[0].values.map((r) => String(r[0])) : []);
    return V2_TABLES.every((t) => found.has(t));
  } catch {
    return false;
  }
}
