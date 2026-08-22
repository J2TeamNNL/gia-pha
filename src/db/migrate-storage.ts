/**
 * Điều phối migration v1 → v2 ở tầng LƯU TRỮ (IndexedDB).
 *
 * `migrate-v2.ts` chỉ biến đổi một `Database` trong bộ nhớ. File này quyết định
 * **khi nào được phép ghi xuống đĩa**, và đó mới là chỗ dữ liệu thật có thể mất.
 *
 * Bốn cổng bắt buộc, đúng thứ tự. Không cổng nào bỏ được:
 *
 * | | Việc | Thất bại ⇒ |
 * |---|---|---|
 * | P0 | xin storage bền, đọc bytes v1 | dừng, không chạm gì |
 * | P1 | **tải file backup về máy người dùng** | dừng — đây là cổng CỨNG |
 * | P2 | **verify backup**: mở lại bytes vừa tải, đếm row, so với nguồn | dừng, không chạm bản gốc |
 * | P3 | ghi bản v2 vào **KEY IndexedDB MỚI**, để nguyên blob v1 | dừng, bản gốc vẫn ở chỗ cũ |
 *
 * P1 là file tải về **chứ không phải một key IndexedDB khác**: IndexedDB chính là
 * cái kho có thể bay hơi, nên backup nằm trong đó thì không phải backup.
 *
 * P3 là thứ làm việc xoá trở nên **bất khả thi về cấu trúc**, chứ không chỉ là
 * "đã tránh". Chạy `isSchemaValid()` của code CŨ lên một file v2 sẽ trả `false`,
 * và code cũ phản ứng bằng cách xoá sạch. Ta không ép được mọi service-worker
 * shell đã cache phải cập nhật — nên file v2 phải nằm ở một key mà code cũ
 * **không bao giờ đọc tới**.
 */
import { migrateToV2, MigrationError, type MigrationReport } from "./migrate-v2";
import { getUserVersion, isV2Schema } from "./schema-v2";

type Db = import("sql.js").Database;

/** Key v1 — code cũ đọc key này. KHÔNG BAO GIỜ ghi dữ liệu v2 lên đây. */
export const V1_DATA_KEY = "main";
/** Key v2 — code cũ không biết key này tồn tại. */
export const V2_DATA_KEY = "main.v2";

export interface StoredVersions {
  hasV1: boolean;
  hasV2: boolean;
}

export interface MigrationOutcome {
  report: MigrationReport;
  /** Bytes v2 đã sẵn sàng ghi vào `V2_DATA_KEY`. Caller là nơi thực sự ghi. */
  bytes: Uint8Array;
}

/** Backup chưa được xác nhận là đọc lại được. */
export class BackupNotVerifiedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupNotVerifiedError";
  }
}

/**
 * P2 — verify backup bằng cách **mở lại và đếm row**, không phải bằng cách tin
 * rằng `Blob` đã được tạo.
 *
 * @param openDatabase hàm mở một `Database` từ bytes (tiêm vào để test được ở Node)
 * @throws BackupNotVerifiedError nếu số row không khớp nguồn
 */
export function verifyBackupBytes(
  sourceDb: Db,
  backupBytes: Uint8Array,
  openDatabase: (bytes: Uint8Array) => Db,
): { persons: number; relationships: number } {
  if (backupBytes.byteLength === 0) {
    throw new BackupNotVerifiedError("File backup rỗng — dừng, không migrate.");
  }

  const countIn = (db: Db, table: string): number => {
    const res = db.exec(`SELECT count(*) FROM ${table}`);
    return res.length ? Number(res[0].values[0][0]) : 0;
  };

  let reopened: Db;
  try {
    reopened = openDatabase(backupBytes);
  } catch (err) {
    throw new BackupNotVerifiedError(
      `Không mở lại được file backup vừa tạo (${(err as Error).message}) — dừng, không migrate.`,
    );
  }

  try {
    const expected = {
      persons: countIn(sourceDb, "persons"),
      relationships: countIn(sourceDb, "relationships"),
    };
    // Một file hỏng có thể MỞ ĐƯỢC mà không có bảng nào: SQLite coi bytes rác
    // ngắn là một DB mới tinh. Lỗi "no such table" ở đây nghĩa là backup không
    // dùng được, phải nói đúng như vậy chứ không để lỗi SQL thô lọt ra ngoài.
    let actual: { persons: number; relationships: number };
    try {
      actual = {
        persons: countIn(reopened, "persons"),
        relationships: countIn(reopened, "relationships"),
      };
    } catch (err) {
      throw new BackupNotVerifiedError(
        `File backup mở được nhưng không chứa bảng gia phả nào (${(err as Error).message}) — dừng, không migrate.`,
      );
    }
    if (actual.persons !== expected.persons || actual.relationships !== expected.relationships) {
      throw new BackupNotVerifiedError(
        `Backup không khớp bản gốc: người ${actual.persons}/${expected.persons}, ` +
          `quan hệ ${actual.relationships}/${expected.relationships} — dừng, không migrate.`,
      );
    }
    return actual;
  } finally {
    reopened.close();
  }
}

/**
 * Chạy migration trên MỘT BẢN SAO trong bộ nhớ và trả bytes kết quả.
 * Không ghi vào IndexedDB — caller ghi, và chỉ ghi vào `V2_DATA_KEY`.
 *
 * @param v1Bytes bytes của blob v1 (bản gốc trên đĩa KHÔNG bị chạm)
 * @param openDatabase hàm mở `Database` từ bytes
 * @param backupVerified phải là `true`. Tham số này tồn tại để việc bỏ qua cổng
 *        P1/P2 phải là một hành động CỐ Ý và nhìn thấy được ở chỗ gọi.
 */
export function migrateBytesToV2(
  v1Bytes: Uint8Array,
  openDatabase: (bytes: Uint8Array) => Db,
  backupVerified: boolean,
): MigrationOutcome {
  if (!backupVerified) {
    throw new BackupNotVerifiedError(
      "Chưa có backup đã verify — từ chối migrate. Hãy tải file backup về trước.",
    );
  }

  const working = openDatabase(v1Bytes);
  try {
    const report = migrateToV2(working);
    if (!isV2Schema(working) || getUserVersion(working) !== 2) {
      throw new MigrationError("Sau migration file vẫn không đúng hình dạng v2.");
    }
    return { report, bytes: working.export() };
  } finally {
    // Bản làm việc luôn bị đóng. Nếu có lỗi thì nó bị vứt bỏ hoàn toàn và blob v1
    // trên đĩa chưa hề bị đụng tới.
    working.close();
  }
}

/**
 * Chọn key nào để mở, theo những gì đang có trên đĩa.
 * v2 luôn thắng. Chỉ có v1 ⇒ app phải MỜI người dùng migrate, không tự chạy:
 * cổng P1 yêu cầu người dùng nhận file backup, mà việc đó cần một cú bấm.
 */
export function chooseStorageKey(versions: StoredVersions):
  | { action: "open-v2"; key: string }
  | { action: "open-v1-offer-migration"; key: string }
  | { action: "fresh-v2"; key: string } {
  if (versions.hasV2) return { action: "open-v2", key: V2_DATA_KEY };
  if (versions.hasV1) return { action: "open-v1-offer-migration", key: V1_DATA_KEY };
  return { action: "fresh-v2", key: V2_DATA_KEY };
}
