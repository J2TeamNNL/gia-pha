import { describe, expect, it } from "vitest";
import { looksLikeSqliteFile, readLegacySqliteBytes } from "./legacy-indexeddb";

const SQLITE_HEADER = new TextEncoder().encode("SQLite format 3\0");

/** A SQLite-looking payload; content past the header is irrelevant here. */
function sqliteBytes(tail = "family"): Uint8Array {
  const tailBytes = new TextEncoder().encode(tail);
  const bytes = new Uint8Array(SQLITE_HEADER.length + tailBytes.length);
  bytes.set(SQLITE_HEADER, 0);
  bytes.set(tailBytes, SQLITE_HEADER.length);
  return bytes;
}

interface FakeStore {
  [key: string]: unknown;
}

/**
 * Minimal IDBFactory good enough for the one open-and-read path this module
 * uses. Events fire on a later tick so handlers attached after the call still
 * run, matching how the real API behaves.
 */
function fakeFactory(options: {
  /** Missing means the database does not exist yet. */
  stores?: Record<string, FakeStore>;
  openThrows?: boolean;
}) {
  const created: string[] = [];
  const closed: string[] = [];
  const aborted: string[] = [];

  const factory = {
    open(name: string) {
      if (options.openThrows) throw new Error("blocked by policy");
      const request: Record<string, unknown> = { error: null, result: null };
      const exists = options.stores !== undefined;

      setTimeout(() => {
        if (!exists) {
          // Real IndexedDB creates the database here; the module must undo it.
          created.push(name);
          request.transaction = {
            abort() {
              aborted.push(name);
              (request.onerror as (() => void) | undefined)?.();
            },
          };
          (request.onupgradeneeded as (() => void) | undefined)?.();
          return;
        }

        const stores = options.stores ?? {};
        request.result = {
          objectStoreNames: { contains: (store: string) => store in stores },
          close: () => closed.push(name),
          transaction(store: string) {
            return {
              objectStore(_name: string) {
                void _name;
                return {
                  get(key: string) {
                    const read: Record<string, unknown> = {};
                    setTimeout(() => {
                      read.result = stores[store]?.[key];
                      (read.onsuccess as (() => void) | undefined)?.();
                    }, 0);
                    return read;
                  },
                };
              },
            };
          },
        };
        (request.onsuccess as (() => void) | undefined)?.();
      }, 0);

      return request as unknown as IDBOpenDBRequest;
    },
  } as unknown as IDBFactory;

  return { factory, created, closed, aborted };
}

describe("reading the sql.js build's IndexedDB database", () => {
  it("returns the stored bytes so a tree entered on the old build survives", async () => {
    const bytes = sqliteBytes();
    const { factory } = fakeFactory({ stores: { "sqlite-file": { main: bytes } } });

    await expect(readLegacySqliteBytes(factory)).resolves.toEqual(bytes);
  });

  it("accepts an ArrayBuffer, which some browsers hand back instead", async () => {
    const bytes = sqliteBytes();
    const { factory } = fakeFactory({
      stores: { "sqlite-file": { main: bytes.slice().buffer } },
    });

    await expect(readLegacySqliteBytes(factory)).resolves.toEqual(bytes);
  });

  it("leaves no empty database behind when there is nothing to import", async () => {
    const { factory, created, aborted } = fakeFactory({});

    await expect(readLegacySqliteBytes(factory)).resolves.toBeNull();
    // Opening a missing name creates it, so the abort is what keeps the origin
    // clean for browsers that count databases against a quota.
    expect(created).toEqual(["gia-pha-db"]);
    expect(aborted).toEqual(["gia-pha-db"]);
  });

  it("returns null when the database exists without the expected store", async () => {
    const { factory } = fakeFactory({ stores: { "something-else": {} } });

    await expect(readLegacySqliteBytes(factory)).resolves.toBeNull();
  });

  it("returns null when the store exists but holds no blob under the key", async () => {
    const { factory } = fakeFactory({ stores: { "sqlite-file": {} } });

    await expect(readLegacySqliteBytes(factory)).resolves.toBeNull();
  });

  it("treats a zero-length blob as nothing to import", async () => {
    const { factory } = fakeFactory({
      stores: { "sqlite-file": { main: new Uint8Array(0) } },
    });

    await expect(readLegacySqliteBytes(factory)).resolves.toBeNull();
  });

  it("closes the database it opened", async () => {
    const { factory, closed } = fakeFactory({
      stores: { "sqlite-file": { main: sqliteBytes() } },
    });

    await readLegacySqliteBytes(factory);
    expect(closed).toEqual(["gia-pha-db"]);
  });

  it("returns null where IndexedDB is unavailable, such as in a bare worker", async () => {
    await expect(readLegacySqliteBytes(undefined)).resolves.toBeNull();
  });

  it("returns null when opening is blocked outright", async () => {
    const { factory } = fakeFactory({ openThrows: true });

    await expect(readLegacySqliteBytes(factory)).resolves.toBeNull();
  });
});

describe("guarding against importing something that is not a database", () => {
  it("accepts bytes carrying the SQLite header", () => {
    expect(looksLikeSqliteFile(sqliteBytes())).toBe(true);
  });

  it("rejects an unrelated blob that happens to sit under the same key", () => {
    expect(looksLikeSqliteFile(new TextEncoder().encode("not a database at all"))).toBe(false);
  });

  it("rejects bytes shorter than the header", () => {
    expect(looksLikeSqliteFile(SQLITE_HEADER.slice(0, 4))).toBe(false);
  });
});
