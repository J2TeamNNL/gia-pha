import { describe, expect, it } from "vitest";
import { getDatabaseRuntimeError } from "./client";

const supportedEnvironment = {
  Worker: class Worker {},
  isSecureContext: true,
  crossOriginIsolated: true,
  SharedArrayBuffer,
  navigator: {
    storage: {
      getDirectory: async () => ({} as FileSystemDirectoryHandle),
    },
  },
};

describe("SQLite OPFS runtime support", () => {
  it("accepts an isolated, secure browser with OPFS", () => {
    expect(getDatabaseRuntimeError(supportedEnvironment)).toBeNull();
  });

  it.each([
    ["missing workers", { ...supportedEnvironment, Worker: undefined }, "Web Workers"],
    ["insecure context", { ...supportedEnvironment, isSecureContext: false }, "HTTPS"],
    [
      "missing isolation headers",
      { ...supportedEnvironment, crossOriginIsolated: false },
      "Cross-Origin-Opener-Policy",
    ],
    [
      "missing OPFS",
      { ...supportedEnvironment, navigator: { storage: {} } },
      "OPFS",
    ],
  ])("rejects %s without transient storage", (_name, environment, expected) => {
    expect(getDatabaseRuntimeError(environment)?.message).toContain(expected);
  });
});
