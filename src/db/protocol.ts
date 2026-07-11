/**
 * Shared message protocol between the main-thread SQLite client and the
 * SQLite worker. Both sides must import these types from this module so the
 * postMessage contract cannot silently drift.
 */
import type { ActiveTreeMetadata, TreeMetadata } from "./catalog";

export type SqlValue = string | number | null | Uint8Array;

export interface QueryResult {
  columns: string[];
  values: SqlValue[][];
}

export type WorkerCommand =
  | { type: "initialize" }
  | { type: "exec"; sql: string; params?: SqlValue[] }
  | { type: "run"; sql: string; params?: SqlValue[] }
  | { type: "close" }
  | { type: "list-trees" }
  | { type: "create-tree"; name: string }
  | { type: "rename-tree"; treeId: string; name: string }
  | { type: "open-tree"; treeId: string }
  | { type: "delete-tree"; treeId: string; confirmed: boolean }
  | { type: "get-active-tree" };

export type WorkerRequest = WorkerCommand & { id: number };

export type WorkerResponse =
  | {
      id: number;
      ok: true;
      result?:
        | QueryResult[]
        | TreeMetadata[]
        | TreeMetadata
        | ActiveTreeMetadata;
    }
  | { id: number; ok: false; error: string };
