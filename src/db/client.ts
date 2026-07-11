import type { ActiveTreeMetadata, TreeMetadata } from "./catalog";
import type {
  QueryResult,
  SqlValue,
  WorkerCommand,
  WorkerRequest,
  WorkerResponse,
} from "./protocol";

export type { QueryResult, SqlValue } from "./protocol";

export interface DatabaseClient {
  exec(sql: string, params?: SqlValue[]): Promise<QueryResult[]>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  close(): Promise<void>;
  listTrees(): Promise<TreeMetadata[]>;
  createTree(name: string): Promise<TreeMetadata>;
  renameTree(id: string, name: string): Promise<TreeMetadata>;
  openTree(id: string): Promise<TreeMetadata>;
  deleteTree(id: string, confirmed: boolean): Promise<void>;
  getActiveTree(): Promise<ActiveTreeMetadata>;
}

type RuntimeEnvironment = {
  isSecureContext?: boolean;
  crossOriginIsolated?: boolean;
  SharedArrayBuffer?: typeof SharedArrayBuffer;
  Worker?: unknown;
  navigator?: {
    storage?: {
      getDirectory?: () => Promise<unknown>;
    };
  };
};

export class DatabaseRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseRuntimeError";
  }
}

export function getDatabaseRuntimeError(
  environment: RuntimeEnvironment = globalThis,
): DatabaseRuntimeError | null {
  if (!environment.Worker) {
    return new DatabaseRuntimeError(
      "Local database is unavailable because this browser does not support Web Workers.",
    );
  }
  if (!environment.isSecureContext) {
    return new DatabaseRuntimeError(
      "Local database requires a secure HTTPS context.",
    );
  }
  if (!environment.crossOriginIsolated || !environment.SharedArrayBuffer) {
    return new DatabaseRuntimeError(
      "Local database requires Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy isolation headers.",
    );
  }
  if (!environment.navigator?.storage?.getDirectory) {
    return new DatabaseRuntimeError(
      "Local database requires Origin Private File System (OPFS), which this browser does not provide.",
    );
  }
  return null;
}

class SqliteWorkerClient implements DatabaseClient {
  private nextId = 0;
  private readonly pending = new Map<
    number,
    {
      resolve: (response: WorkerResponse) => void;
      reject: (reason: Error) => void;
    }
  >();

  private fatalError: DatabaseRuntimeError | null = null;

  constructor(
    private readonly worker: Worker,
    private readonly onFatalError?: (error: DatabaseRuntimeError) => void,
  ) {
    worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
      const request = this.pending.get(event.data.id);
      if (!request) return;
      this.pending.delete(event.data.id);
      request.resolve(event.data);
    });
    worker.addEventListener("error", (event) => {
      const error = new DatabaseRuntimeError(
        event.message || "The SQLite database worker stopped unexpectedly.",
      );
      // The worker is unusable after an uncaught error: fail current and all
      // future requests instead of letting their promises hang forever.
      this.fatalError = error;
      for (const request of this.pending.values()) request.reject(error);
      this.pending.clear();
      this.onFatalError?.(error);
    });
  }

  async initialize(): Promise<void> {
    await this.request({ type: "initialize" });
  }

  async exec(sql: string, params?: SqlValue[]): Promise<QueryResult[]> {
    const response = await this.request({ type: "exec", sql, params });
    return (response.result as QueryResult[] | undefined) ?? [];
  }

  async run(sql: string, params?: SqlValue[]): Promise<void> {
    await this.request({ type: "run", sql, params });
  }

  async close(): Promise<void> {
    try {
      await this.request({ type: "close" });
    } finally {
      this.worker.terminate();
    }
  }

  async listTrees(): Promise<TreeMetadata[]> {
    return (await this.request({ type: "list-trees" })).result as TreeMetadata[];
  }

  async createTree(name: string): Promise<TreeMetadata> {
    return (await this.request({ type: "create-tree", name }))
      .result as TreeMetadata;
  }

  async renameTree(id: string, name: string): Promise<TreeMetadata> {
    return (await this.request({ type: "rename-tree", treeId: id, name }))
      .result as TreeMetadata;
  }

  async openTree(id: string): Promise<TreeMetadata> {
    return (await this.request({ type: "open-tree", treeId: id }))
      .result as TreeMetadata;
  }

  async deleteTree(id: string, confirmed: boolean): Promise<void> {
    await this.request({ type: "delete-tree", treeId: id, confirmed });
  }

  async getActiveTree(): Promise<ActiveTreeMetadata> {
    return (await this.request({ type: "get-active-tree" }))
      .result as ActiveTreeMetadata;
  }

  private request(
    message: WorkerCommand,
  ): Promise<Extract<WorkerResponse, { ok: true }>> {
    if (this.fatalError) return Promise.reject(this.fatalError);
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: (response) => {
          if (response.ok) resolve(response);
          else reject(new DatabaseRuntimeError(response.error));
        },
        reject,
      });
      this.worker.postMessage({ ...message, id } satisfies WorkerRequest);
    });
  }
}

let databasePromise: Promise<SqliteWorkerClient> | null = null;

export async function getDb(): Promise<DatabaseClient> {
  if (!databasePromise) {
    const supportError = getDatabaseRuntimeError();
    if (supportError) throw supportError;

    databasePromise = (async () => {
      const worker = new Worker(new URL("./sqlite.worker.ts", import.meta.url), {
        type: "module",
        name: "gia-pha-sqlite",
      });
      const client = new SqliteWorkerClient(worker, () => {
        // Allow the next getDb() call to spawn a fresh worker.
        databasePromise = null;
        worker.terminate();
      });
      try {
        await client.initialize();
        return client;
      } catch (error) {
        worker.terminate();
        throw error;
      }
    })().catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

export async function listTrees(): Promise<TreeMetadata[]> {
  return (await getDb()).listTrees();
}

export async function createTree(name: string): Promise<TreeMetadata> {
  return (await getDb()).createTree(name);
}

export async function renameTree(
  id: string,
  name: string,
): Promise<TreeMetadata> {
  return (await getDb()).renameTree(id, name);
}

export async function openTree(id: string): Promise<TreeMetadata> {
  return (await getDb()).openTree(id);
}

export async function deleteTree(id: string, confirmed: boolean): Promise<void> {
  await (await getDb()).deleteTree(id, confirmed);
}

export async function getActiveTree(): Promise<ActiveTreeMetadata> {
  return (await getDb()).getActiveTree();
}
