/**
 * sql.js Database Client
 * Loads SQLite WASM, validates the schema at runtime, and persists to IndexedDB.
 *
 * Schema versioning: if the stored schema is stale (missing required columns),
 * the DB is wiped and a fresh one is created automatically.
 */
let dbInstance: import("sql.js").Database | null = null;

export async function getDb(): Promise<import("sql.js").Database> {
  if (dbInstance) return dbInstance;

  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs({
    locateFile: () => "/sql-wasm.wasm",
  });

  const { initDatabaseSchema, isSchemaValid } = await import("./schema");

  // Try loading existing DB from IndexedDB
  const saved = await loadFromIndexedDB();

  if (saved) {
    const candidate = new SQL.Database(saved);
    if (isSchemaValid(candidate)) {
      // Existing DB is compatible — use it
      dbInstance = candidate;
      return dbInstance;
    } else {
      // Stale schema — wipe and recreate
      console.warn(
        "[gia-pha] Stale DB schema detected – wiping IndexedDB for fresh start.",
      );
      candidate.close();
      await clearIndexedDB();
    }
  }

  // Fresh DB
  dbInstance = new SQL.Database();
  initDatabaseSchema(dbInstance);
  await persistDb(dbInstance);

  return dbInstance;
}

export async function saveDb(): Promise<void> {
  if (!dbInstance) return;
  await persistDb(dbInstance);
}

// -- IndexedDB helpers --

const DB_NAME = "gia-pha-db";
const STORE_NAME = "sqlite-file";
const DATA_KEY = "main";

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  try {
    const idb = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(DATA_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function persistDb(db: import("sql.js").Database): Promise<void> {
  const data = db.export();
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(data, DATA_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearIndexedDB(): Promise<void> {
  try {
    const idb = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}
