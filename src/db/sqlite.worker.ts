import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import { applyMigrations } from "./schema";
import {
  normalizeTreeName,
  requireDeleteConfirmation,
  selectNextActiveTree,
  type TreeMetadata,
} from "./catalog";
import type {
  QueryResult,
  SqlValue,
  WorkerRequest,
  WorkerResponse,
} from "./protocol";

type SqliteDatabase = InstanceType<
  Awaited<ReturnType<typeof sqlite3InitModule>>["oo1"]["OpfsDb"]
>;
type SqliteRuntime = Awaited<ReturnType<typeof sqlite3InitModule>>;

const CATALOG_FILE = "/gia-pha.catalog.sqlite3";
const LEGACY_TREE_FILE = "/gia-pha.sqlite3";
const LEGACY_TREE_ID = "legacy-single-tree";
const ACTIVE_TREE_KEY = "active_tree_id";
const CATALOG_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS trees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    file_name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS catalog_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

let sqlite3: SqliteRuntime | null = null;
let catalogDatabase: SqliteDatabase | null = null;
let treeDatabase: SqliteDatabase | null = null;
let activeTreeId: string | null = null;
let workQueue = Promise.resolve();

function currentCatalog(): SqliteDatabase {
  if (!catalogDatabase) throw new Error("The SQLite catalog has not been initialized.");
  return catalogDatabase;
}

function currentTree(): SqliteDatabase {
  if (!treeDatabase || !activeTreeId) {
    throw new Error("No family tree is open. Create or open a tree before reading family data.");
  }
  return treeDatabase;
}

function now(): string {
  return new Date().toISOString();
}

function rows(db: SqliteDatabase, sql: string, params?: SqlValue[]): QueryResult[] {
  const values: SqlValue[][] = [];
  const columns: string[] = [];
  db.exec({ sql, bind: params, rowMode: "array", resultRows: values, columnNames: columns });
  return columns.length ? [{ columns, values }] : [];
}

function run(db: SqliteDatabase, sql: string, params?: SqlValue[]): void {
  db.exec({ sql, bind: params });
}

function migrateTreeDatabase(db: SqliteDatabase): void {
  applyMigrations({
    getUserVersion: () => {
      const values: SqlValue[][] = [];
      db.exec({ sql: "PRAGMA user_version", rowMode: "array", resultRows: values });
      return Number(values[0]?.[0] ?? 0);
    },
    exec: (sql) => db.exec(sql),
    setUserVersion: (version) => db.exec(`PRAGMA user_version = ${version}`),
    now,
  });
}

function catalogRows(sql: string, params?: SqlValue[]): SqlValue[][] {
  return rows(currentCatalog(), sql, params)[0]?.values ?? [];
}

function asTree(row: SqlValue[]): TreeMetadata {
  return {
    id: String(row[0]),
    name: String(row[1]),
    createdAt: String(row[2]),
    updatedAt: String(row[3]),
  };
}

function listTreesInternal(): TreeMetadata[] {
  return catalogRows(
    "SELECT id, name, created_at, updated_at FROM trees ORDER BY created_at, id",
  ).map(asTree);
}

function getTreeRecord(id: string): { metadata: TreeMetadata; fileName: string } {
  const row = catalogRows(
    "SELECT id, name, created_at, updated_at, file_name FROM trees WHERE id = ?",
    [id],
  )[0];
  if (!row) throw new Error("The requested family tree does not exist.");
  return { metadata: asTree(row), fileName: String(row[4]) };
}

function getStoredActiveTreeId(): string | null {
  const row = catalogRows("SELECT value FROM catalog_metadata WHERE key = ?", [ACTIVE_TREE_KEY])[0];
  return row ? String(row[0]) : null;
}

function storeActiveTreeId(id: string | null): void {
  if (id) {
    run(
      currentCatalog(),
      "INSERT INTO catalog_metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [ACTIVE_TREE_KEY, id],
    );
  } else {
    run(currentCatalog(), "DELETE FROM catalog_metadata WHERE key = ?", [ACTIVE_TREE_KEY]);
  }
}

function openTreeDatabase(record: { metadata: TreeMetadata; fileName: string }): TreeMetadata {
  treeDatabase?.close();
  const sqlite = currentSqlite();
  treeDatabase = new sqlite.oo1.OpfsDb(record.fileName);
  migrateTreeDatabase(treeDatabase);
  activeTreeId = record.metadata.id;
  storeActiveTreeId(activeTreeId);
  return record.metadata;
}

function currentSqlite(): SqliteRuntime {
  if (!sqlite3) throw new Error("SQLite has not been initialized.");
  return sqlite3;
}

async function migrateLegacyTreeIfNeeded(): Promise<void> {
  if (listTreesInternal().length || !(await opfsEntryExists(LEGACY_TREE_FILE))) {
    return;
  }
  const timestamp = now();
  run(
    currentCatalog(),
    "INSERT INTO trees (id, name, file_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [LEGACY_TREE_ID, "Legacy family tree", LEGACY_TREE_FILE, timestamp, timestamp],
  );
  storeActiveTreeId(LEGACY_TREE_ID);
}

async function initialize(): Promise<void> {
  if (catalogDatabase) return;
  const initialized = (await sqlite3InitModule()) as SqliteRuntime;
  if (!initialized.oo1.OpfsDb) {
    throw new Error("SQLite OPFS storage is unavailable; transient storage is not used.");
  }
  sqlite3 = initialized;
  catalogDatabase = new initialized.oo1.OpfsDb(CATALOG_FILE);
  catalogDatabase.exec(CATALOG_SCHEMA_SQL);
  await migrateLegacyTreeIfNeeded();
  const storedActiveTreeId = getStoredActiveTreeId();
  if (storedActiveTreeId) openTreeDatabase(getTreeRecord(storedActiveTreeId));
}

function filePathParts(fileName: string): string[] {
  return fileName.split("/").filter(Boolean);
}

async function resolveOpfsEntry(
  fileName: string,
): Promise<{ directory: FileSystemDirectoryHandle; file: string } | null> {
  const parts = filePathParts(fileName);
  const file = parts.pop();
  if (!file) return null;
  let directory = await navigator.storage.getDirectory();
  for (const part of parts) {
    directory = await directory.getDirectoryHandle(part);
  }
  return { directory, file };
}

async function opfsEntryExists(fileName: string): Promise<boolean> {
  try {
    const entry = await resolveOpfsEntry(fileName);
    if (!entry) return false;
    await entry.directory.getFileHandle(entry.file);
    return true;
  } catch {
    return false;
  }
}

async function deleteOpfsFile(fileName: string): Promise<boolean> {
  try {
    const entry = await resolveOpfsEntry(fileName);
    if (!entry) return false;
    await entry.directory.removeEntry(entry.file);
    return true;
  } catch {
    return false;
  }
}

function createTree(name: string): TreeMetadata {
  const id = crypto.randomUUID();
  const timestamp = now();
  const metadata: TreeMetadata = { id, name: normalizeTreeName(name), createdAt: timestamp, updatedAt: timestamp };
  const fileName = `/trees/${id}.sqlite3`;
  const sqlite = currentSqlite();
  const db = new sqlite.oo1.OpfsDb(fileName);
  try {
    migrateTreeDatabase(db);
  } finally {
    db.close();
  }
  run(
    currentCatalog(),
    "INSERT INTO trees (id, name, file_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [metadata.id, metadata.name, fileName, metadata.createdAt, metadata.updatedAt],
  );
  if (!activeTreeId) openTreeDatabase({ metadata, fileName });
  return metadata;
}

function renameTree(id: string, name: string): TreeMetadata {
  const record = getTreeRecord(id);
  const metadata = { ...record.metadata, name: normalizeTreeName(name), updatedAt: now() };
  run(currentCatalog(), "UPDATE trees SET name = ?, updated_at = ? WHERE id = ?", [metadata.name, metadata.updatedAt, id]);
  return metadata;
}

function closeTreeForDeletion(id: string, confirmed: boolean): boolean {
  requireDeleteConfirmation(confirmed);
  const isActive = id === activeTreeId;
  if (isActive) {
    treeDatabase?.close();
    treeDatabase = null;
    activeTreeId = null;
  }
  return isActive;
}

async function deleteTreePersisted(id: string, confirmed: boolean): Promise<void> {
  const record = getTreeRecord(id);
  const wasActive = closeTreeForDeletion(id, confirmed);
  const deleted = await deleteOpfsFile(record.fileName);
  if (!deleted) {
    // Restore the connection closed above so a failed delete leaves the
    // catalog and the open tree consistent.
    if (wasActive) openTreeDatabase(record);
    throw new Error("The family tree file could not be deleted.");
  }
  run(currentCatalog(), "DELETE FROM trees WHERE id = ?", [id]);
  if (wasActive) {
    const nextActiveId = selectNextActiveTree(listTreesInternal(), id);
    if (nextActiveId) openTreeDatabase(getTreeRecord(nextActiveId));
    else storeActiveTreeId(null);
  }
}

async function handle(request: WorkerRequest): Promise<WorkerResponse> {
  switch (request.type) {
    case "initialize":
      await initialize();
      return { id: request.id, ok: true };
    case "exec":
      return { id: request.id, ok: true, result: rows(currentTree(), request.sql, request.params) };
    case "run":
      run(currentTree(), request.sql, request.params);
      return { id: request.id, ok: true };
    case "close":
      treeDatabase?.close();
      catalogDatabase?.close();
      treeDatabase = null;
      catalogDatabase = null;
      activeTreeId = null;
      return { id: request.id, ok: true };
    case "list-trees":
      return { id: request.id, ok: true, result: listTreesInternal() };
    case "create-tree":
      return { id: request.id, ok: true, result: createTree(request.name) };
    case "rename-tree":
      return { id: request.id, ok: true, result: renameTree(request.treeId, request.name) };
    case "open-tree":
      return { id: request.id, ok: true, result: openTreeDatabase(getTreeRecord(request.treeId)) };
    case "delete-tree":
      await deleteTreePersisted(request.treeId, request.confirmed);
      return { id: request.id, ok: true };
    case "get-active-tree":
      return { id: request.id, ok: true, result: { activeTreeId } };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  workQueue = workQueue
    .then(async () => self.postMessage(await handle(event.data) satisfies WorkerResponse))
    .catch((error: unknown) => {
      self.postMessage({ id: event.data.id, ok: false, error: errorMessage(error) } satisfies WorkerResponse);
    });
});
