/**
 * Export / import file lossless — đường thoát duy nhất của người dùng.
 *
 * Tại sao đây là việc làm trước tiên (xem `docs/sync-durability.md` §2, §4.3):
 * gia phả là dữ liệu không thể tạo lại, mà toàn bộ dữ liệu hiện chỉ nằm trong
 * IndexedDB của một trình duyệt. Backup phải là ARTIFACT NGƯỜI DÙNG GIỮ ĐƯỢC
 * (file tải về), không phải một key khác trong chính chỗ có thể bay.
 *
 * Lossless: xuất nguyên file SQLite (`db.export()`), không qua JSON trung gian,
 * nên không mất cột nào, không mất kiểu nào, không mất bảng nào.
 */
import { exportBytes, replaceDb } from "./client";
import { getUserVersion, isSchemaValid } from "./schema";

/** Số đếm dùng để người dùng tự đối chiếu trước/sau khi import. */
export interface BackupContents {
  persons: number;
  relationships: number;
  quarantined: number;
  schemaVersion: number;
}

export class InvalidBackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBackupError";
  }
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** `gia-pha-2026-08-22-0157.sqlite` — tên có thời điểm để nhiều bản không đè nhau. */
export function backupFilename(now = new Date()): string {
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `gia-pha-${stamp}.sqlite`;
}

/** File SQLite của cây hiện tại, kèm số đếm để hiển thị cho người dùng. */
export async function createBackup(): Promise<{
  blob: Blob;
  filename: string;
  contents: BackupContents;
}> {
  const bytes = await exportBytes();
  const contents = await inspectBytes(bytes);
  return {
    // Sao chép sang ArrayBuffer riêng: Blob không được giữ tham chiếu vào heap wasm.
    blob: new Blob([bytes.slice().buffer as ArrayBuffer], {
      type: "application/x-sqlite3",
    }),
    filename: backupFilename(),
    contents,
  };
}

/** Tải file backup xuống máy người dùng. */
export async function downloadBackup(): Promise<BackupContents> {
  const { blob, filename, contents } = await createBackup();
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Nhả sau một nhịp để trình duyệt kịp bắt đầu tải.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  return contents;
}

/**
 * Mở file trong một DB tạm và ĐẾM ROW. Đây là bước verify bắt buộc trước mọi
 * hành động phá huỷ: một file không mở được, hoặc mở ra rỗng, sẽ không bao giờ
 * thay thế cây đang có.
 *
 * @throws InvalidBackupError nếu file không phải DB gia phả đọc được.
 */
export async function inspectBytes(bytes: Uint8Array): Promise<BackupContents> {
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });

  let db: import("sql.js").Database;
  try {
    db = new SQL.Database(bytes);
  } catch (err) {
    throw new InvalidBackupError(
      `Không mở được file này như một database SQLite (${(err as Error).message}).`,
    );
  }

  try {
    if (!isSchemaValid(db)) {
      throw new InvalidBackupError(
        "File mở được nhưng không có đủ bảng/cột của gia phả. Đây có thể là file SQLite của app khác.",
      );
    }
    const count = (table: string): number => {
      const res = db.exec(`SELECT count(*) FROM ${table}`);
      return res.length ? Number(res[0].values[0][0]) : 0;
    };
    const hasQuarantine =
      db.exec(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='relationships_quarantine'",
      )[0].values[0][0] === 1;

    return {
      persons: count("persons"),
      relationships: count("relationships"),
      quarantined: hasQuarantine ? count("relationships_quarantine") : 0,
      schemaVersion: getUserVersion(db),
    };
  } finally {
    db.close();
  }
}

/** Đọc + verify một file người dùng chọn, CHƯA thay thế gì. */
export async function inspectBackupFile(file: Blob): Promise<{
  bytes: Uint8Array;
  contents: BackupContents;
}> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new InvalidBackupError("File rỗng.");
  }
  return { bytes, contents: await inspectBytes(bytes) };
}

/**
 * Thay cây hiện tại bằng nội dung file backup.
 *
 * Thứ tự bắt buộc, không được đảo:
 *   1. verify file mới (mở lại + đếm row)
 *   2. xuất backup cây HIỆN TẠI ra file tải về (an toàn cho thao tác sai)
 *   3. mới thay thế
 *
 * @param file       file backup người dùng chọn
 * @param options.skipSafetyBackup bỏ bước 2 (chỉ dùng khi cây hiện tại đang rỗng)
 */
export async function restoreFromBackup(
  file: Blob,
  options: { skipSafetyBackup?: boolean } = {},
): Promise<{ restored: BackupContents; safetyBackup: BackupContents | null }> {
  // 1. Verify TRƯỚC.
  const { bytes, contents } = await inspectBackupFile(file);

  // 2. Backup an toàn cây đang có.
  let safetyBackup: BackupContents | null = null;
  if (!options.skipSafetyBackup) {
    safetyBackup = await downloadBackup();
  }

  // 3. Thay thế.
  await replaceDb(bytes);
  return { restored: contents, safetyBackup };
}
