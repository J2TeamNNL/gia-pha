/**
 * Reads the SQLite file left behind by the sql.js build of this app.
 *
 * That build kept the whole database as one blob in IndexedDB. This build keeps
 * databases in OPFS and never looks at IndexedDB, so without this reader every
 * tree entered before the runtime change is still on disk but invisible to the
 * app — which looks exactly like deletion to the family that entered it.
 *
 * This module only ever READS. The legacy blob stays where it is, so a failed
 * or half-finished import can always be retried, and downgrading to the old
 * build still finds its data.
 */

/** Database name used by the sql.js build. */
const LEGACY_DB_NAME = "gia-pha-db";
/** Object store inside that database. */
const LEGACY_STORE_NAME = "sqlite-file";
/** Key the exported SQLite bytes were stored under. */
const LEGACY_DATA_KEY = "main";

/** The stored value has changed shape across browsers; accept every form. */
function toBytes(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}

/**
 * Returns the legacy SQLite bytes, or null when there is nothing to import.
 *
 * Null covers every "no legacy data" case — no IndexedDB, no such database, no
 * such store, no such key, or an unreadable value — because all of them mean
 * the same thing to the caller and none of them is an error worth surfacing.
 */
export function readLegacySqliteBytes(
  factory: IDBFactory | undefined = typeof indexedDB === "undefined" ? undefined : indexedDB,
): Promise<Uint8Array | null> {
  if (!factory) return Promise.resolve(null);

  return new Promise<Uint8Array | null>((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      // Opening without a version avoids triggering an upgrade on a database
      // that already exists at any version.
      request = factory.open(LEGACY_DB_NAME);
    } catch {
      resolve(null);
      return;
    }

    // Opening a name that does not exist CREATES it. That means there is no
    // legacy database, so undo the creation rather than leave an empty one.
    let createdByThisCall = false;
    request.onupgradeneeded = () => {
      createdByThisCall = true;
      request.transaction?.abort();
    };

    request.onblocked = () => resolve(null);

    request.onerror = () => {
      // Aborting the upgrade above surfaces here; that is the empty path, not a
      // failure worth reporting.
      if (createdByThisCall) resolve(null);
      else reject(request.error ?? new Error("Could not open the legacy IndexedDB database."));
    };

    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LEGACY_STORE_NAME)) {
        database.close();
        resolve(null);
        return;
      }
      try {
        const transaction = database.transaction(LEGACY_STORE_NAME, "readonly");
        const read = transaction.objectStore(LEGACY_STORE_NAME).get(LEGACY_DATA_KEY);
        read.onsuccess = () => {
          const bytes = toBytes(read.result);
          database.close();
          resolve(bytes && bytes.byteLength ? bytes : null);
        };
        read.onerror = () => {
          database.close();
          resolve(null);
        };
      } catch {
        database.close();
        resolve(null);
      }
    };
  });
}

/** SQLite stamps every file with this header; used to reject unrelated blobs. */
const SQLITE_HEADER = "SQLite format 3\0";

/** True when the bytes start with the SQLite file header. */
export function looksLikeSqliteFile(bytes: Uint8Array): boolean {
  if (bytes.byteLength < SQLITE_HEADER.length) return false;
  for (let index = 0; index < SQLITE_HEADER.length; index += 1) {
    if (bytes[index] !== SQLITE_HEADER.charCodeAt(index)) return false;
  }
  return true;
}
