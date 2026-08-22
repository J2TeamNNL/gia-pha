/**
 * Vòng đời sql.js + lưu bền vào IndexedDB.
 *
 * Ba luật của file này (xem `docs/sync-durability.md` §1, §3, §4):
 *
 * 1. KHÔNG BAO GIỜ xoá dữ liệu người dùng. Schema lệch thì migrate cộng thêm
 *    (`initDatabaseSchema`), không migrate được thì báo lỗi — không xoá.
 * 2. Lỗi ĐỌC storage không bao giờ được hiểu là "chưa có dữ liệu". Ba trạng thái
 *    phân biệt rõ: `data` · `empty` · `unreadable`. `unreadable` KHÔNG DẪN TỚI GHI.
 * 3. Snapshot lấy TRONG lượt ghi đã xếp hàng, không lấy trước lúc chờ mở
 *    connection — nếu không, hai lần save chồng nhau có thể commit bản CŨ sau cùng.
 */
import {
  enableForeignKeys,
  initDatabaseSchema,
  type SchemaInitResult,
} from "./schema";

type Db = import("sql.js").Database;

const DB_NAME = "gia-pha-db";
const STORE_NAME = "sqlite-file";
const DATA_KEY = "main";

/** Đọc storage thất bại. Tầng UI PHẢI báo lỗi này ra, không được coi là cây rỗng. */
export class StorageUnreadableError extends Error {
  readonly cause?: unknown;
  constructor(cause: unknown) {
    super(
      "Không đọc được dữ liệu đã lưu trong trình duyệt. Chưa ghi gì để tránh " +
        "ghi đè lên cây hiện có. Hãy thử tải lại trang; nếu vẫn lỗi, đừng nhập " +
        "dữ liệu mới trên thiết bị này.",
    );
    this.name = "StorageUnreadableError";
    this.cause = cause;
  }
}

let dbInstance: Db | null = null;
/** Memo hoá PROMISE khởi tạo, không memo kết quả — nếu không sẽ double-init khi mount. */
let initPromise: Promise<Db> | null = null;
let lastInitResult: SchemaInitResult | null = null;

export async function getDb(): Promise<Db> {
  if (!initPromise) {
    initPromise = openDb().catch((err) => {
      // Cho phép thử lại ở lần gọi sau thay vì kẹt vĩnh viễn ở promise lỗi.
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

/** Kết quả migration của lần khởi tạo gần nhất (cột đã thêm, row đã cách ly). */
export function getLastInitResult(): SchemaInitResult | null {
  return lastInitResult;
}

async function openDb(): Promise<Db> {
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });

  const stored = await loadSnapshot();

  // Trạng thái 3: không đọc được → DỪNG. Không tạo DB rỗng, không ghi gì.
  if (stored.kind === "unreadable") throw new StorageUnreadableError(stored.error);

  const db =
    stored.kind === "data" ? new SQL.Database(stored.bytes) : new SQL.Database();

  // PRAGMA foreign_keys không nằm trong file → phải bật lại trên MỖI connection
  // (đã kiểm chứng: sau export/import, connection mới trả về 0).
  enableForeignKeys(db);

  try {
    lastInitResult = initDatabaseSchema(db);
  } catch (err) {
    db.close();
    throw err;
  }

  dbInstance = db;
  void requestPersistentStorage();

  // Chỉ ghi khi có thay đổi thật: DB mới, hoặc migration đã đổi hình dạng.
  const migrated =
    lastInitResult.fresh ||
    lastInitResult.addedColumns.length > 0 ||
    lastInitResult.quarantinedRows > 0 ||
    lastInitResult.fromVersion !== 1;
  if (migrated) await saveDb();

  return db;
}

/**
 * Thay toàn bộ DB đang mở bằng nội dung file khác (dùng cho import backup).
 * Chỉ gọi sau khi đã verify file — xem `backup.ts`.
 */
export async function replaceDb(bytes: Uint8Array): Promise<Db> {
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });

  const next = new SQL.Database(bytes);
  enableForeignKeys(next);
  lastInitResult = initDatabaseSchema(next);

  const previous = dbInstance;
  dbInstance = next;
  initPromise = Promise.resolve(next);
  await saveDb();
  previous?.close();
  return next;
}

// ── Ghi bền: xếp hàng + gộp ───────────────────────────────────────────────────

/** Lần ghi đang chạy. */
let inFlight: Promise<void> | null = null;
/** Lần ghi đã xếp hàng nhưng chưa lấy snapshot — mọi caller mới gộp vào đây. */
let queued: Promise<void> | null = null;

/**
 * Lưu DB xuống IndexedDB. Nhiều lần gọi liên tiếp (luồng "thêm người thân" bắn
 * 3 lần mỗi click) gộp thành MỘT lần ghi, và các lần ghi tuần tự tuyệt đối nên
 * bản mới không bao giờ bị bản cũ commit sau ghi đè.
 */
export function saveDb(): Promise<void> {
  if (!dbInstance) return Promise.resolve();
  if (queued) return queued;

  const run = async (): Promise<void> => {
    if (inFlight) {
      // Chờ lượt trước xong; lỗi của lượt đó là việc của caller lượt đó.
      await inFlight.catch(() => {});
    }
    // Từ đây trở đi caller mới phải xếp lượt ghi KHÁC, vì snapshot dưới đây
    // được lấy đồng bộ ngay lập tức và sẽ không thấy thay đổi đến sau.
    queued = null;
    const snapshot = dbInstance!.export();

    const write = putSnapshot(snapshot);
    inFlight = write;
    try {
      await write;
    } finally {
      if (inFlight === write) inFlight = null;
    }
  };

  queued = run();
  return queued;
}

/** Snapshot thô của DB đang mở — dùng cho export file. */
export async function exportBytes(): Promise<Uint8Array> {
  const db = await getDb();
  return db.export();
}

// ── IndexedDB ─────────────────────────────────────────────────────────────────

let idbConnection: Promise<IDBDatabase> | null = null;

function openIDB(): Promise<IDBDatabase> {
  if (idbConnection) return idbConnection;
  idbConnection = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () =>
      reject(new Error("IndexedDB bị chặn bởi một tab khác đang mở app."));
  }).catch((err) => {
    idbConnection = null;
    throw err;
  });
  return idbConnection;
}

type Snapshot =
  | { kind: "data"; bytes: Uint8Array }
  | { kind: "empty" }
  | { kind: "unreadable"; error: unknown };

/**
 * Đọc snapshot. Phân biệt ba trạng thái — đây là điểm sửa đường mất dữ liệu số 2:
 * bản cũ bọc `catch { return null }` nên một lỗi IndexedDB tạm thời bị hiểu là
 * "chưa có dữ liệu", rồi DB rỗng được ghi lên đúng key cũ.
 */
async function loadSnapshot(): Promise<Snapshot> {
  try {
    const idb = await openIDB();
    const bytes = await new Promise<Uint8Array | undefined>((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(DATA_KEY);
      req.onsuccess = () => resolve(req.result as Uint8Array | undefined);
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });

    if (bytes === undefined || bytes === null) return { kind: "empty" };
    if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
      // Có key nhưng nội dung không dùng được → KHÔNG coi là rỗng.
      return { kind: "unreadable", error: new Error("Snapshot rỗng hoặc sai kiểu") };
    }
    return { kind: "data", bytes };
  } catch (error) {
    return { kind: "unreadable", error };
  }
}

async function putSnapshot(data: Uint8Array): Promise<void> {
  const idb = await openIDB();
  await new Promise<void>((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(data, DATA_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * Xin storage bền. Không có cái này, WebKit xoá storage sau 7 ngày không dùng —
 * kịch bản gần như chắc chắn với app gia phả (cao điểm là dịp Tết).
 */
async function requestPersistentStorage(): Promise<void> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
    if (await navigator.storage.persisted?.()) return;
    await navigator.storage.persist();
  } catch {
    // Không xin được thì thôi — không phải lỗi chặn luồng.
  }
}
