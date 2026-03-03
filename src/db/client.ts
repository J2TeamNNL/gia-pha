/**
 * sql.js Database Client
 * Loads SQLite WASM and initializes/returns the database instance.
 * Uses IndexedDB for persistence.
 *
 * Schema versioning: bump SCHEMA_VERSION whenever you make breaking schema changes.
 * The client will auto-wipe the old DB and create a fresh one.
 */

const SCHEMA_VERSION = 3; // bump this when making breaking schema changes

let dbInstance: import("sql.js").Database | null = null;

export async function getDb(): Promise<import("sql.js").Database> {
  if (dbInstance) return dbInstance;

  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs({
    locateFile: () => "/sql-wasm.wasm",
  });

  // Check stored schema version, wipe if stale
  const storedVersion = await getStoredVersion();
  const saved =
    storedVersion === SCHEMA_VERSION ? await loadFromIndexedDB() : null;

  if (saved) {
    dbInstance = new SQL.Database(saved);
  } else {
    // Fresh DB (new or wiped due to schema version bump)
    dbInstance = new SQL.Database();
  }

  // Always run schema init (safe: uses IF NOT EXISTS + adds new columns)
  const { initDatabaseSchema } = await import("./schema");
  initDatabaseSchema(dbInstance);

  if (!saved) {
    await saveToIndexedDB(dbInstance.export());
    await setStoredVersion(SCHEMA_VERSION);
  }

  return dbInstance;
}

export async function saveDb(): Promise<void> {
  if (!dbInstance) return;
  const data = dbInstance.export();
  await saveToIndexedDB(data);
  await setStoredVersion(SCHEMA_VERSION);
}

// -- IndexedDB helpers --

const DB_NAME = "gia-pha-db";
const STORE_NAME = "sqlite-file";
const META_STORE = "meta";
const DATA_KEY = "main";
const VERSION_KEY = "schema-version";

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2); // IDB version 2 adds meta store
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getStoredVersion(): Promise<number> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(META_STORE, "readonly");
      const req = tx.objectStore(META_STORE).get(VERSION_KEY);
      req.onsuccess = () => resolve(req.result ?? 0);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

async function setStoredVersion(version: number): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readwrite");
    tx.objectStore(META_STORE).put(version, VERSION_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(DATA_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function saveToIndexedDB(data: Uint8Array): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(data, DATA_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
