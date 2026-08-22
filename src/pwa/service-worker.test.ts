/**
 * Guards the service worker's data-safety rails by reading its source.
 *
 * A service worker cannot be exercised in this test environment, and the ways
 * it can lose a family's data are structural — a cache-first navigation, or any
 * reference to stored data at all. Reading the file catches exactly those.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath, URL as NodeUrl } from "node:url";
import { describe, expect, it } from "vitest";

function repoFile(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new NodeUrl(`../../${relativePath}`, import.meta.url)),
    "utf8",
  );
}

const serviceWorkerSource = repoFile("public/sw.js");

describe("service worker data-safety rails", () => {
  it("sends navigations and stable URLs through network-first", () => {
    // The fetch handler must end on networkFirst; a cache-first fallthrough
    // would pin people to a stale shell after a fix ships.
    expect(serviceWorkerSource).toMatch(/event\.respondWith\(networkFirst\(request\)\)/);
    expect(serviceWorkerSource).toMatch(/async function networkFirst/);
  });

  it("only serves content-hashed build output cache-first", () => {
    expect(serviceWorkerSource).toMatch(/function isImmutableAsset/);
    expect(serviceWorkerSource).toMatch(/pathname\.startsWith\("\/assets\/"\)/);
  });

  it("never reaches for stored family data", () => {
    // Checks code, not comments: the tree lives in OPFS with older trees still
    // in IndexedDB, and neither is the worker's business.
    const code = serviceWorkerSource
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    expect(code).not.toMatch(/indexedDB/i);
    expect(code).not.toMatch(/getDirectory|createSyncAccessHandle|StorageManager/);
  });

  it("leaves non-GET requests alone so a write is never replayed from cache", () => {
    expect(serviceWorkerSource).toMatch(/request\.method !== "GET"/);
  });

  it("ignores cross-origin requests", () => {
    expect(serviceWorkerSource).toMatch(/url\.origin !== self\.location\.origin/);
  });

  it("drops older shell caches on activate so a version bump takes effect", () => {
    expect(serviceWorkerSource).toMatch(/caches\.delete\(key\)/);
    expect(serviceWorkerSource).toMatch(/key !== CACHE_NAME/);
  });
});

describe("install manifest", () => {
  const manifest = JSON.parse(repoFile("public/manifest.webmanifest")) as {
    name: string;
    start_url: string;
    display: string;
    icons: { src: string; sizes: string; purpose?: string }[];
  };

  it("declares standalone display, without which iOS will not install it", () => {
    // Installation is the whole point: an uninstalled iOS site loses its storage
    // after roughly seven days of disuse.
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
  });

  it("ships the icon sizes an install prompt needs, including a maskable one", () => {
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  });

  it("points every icon at a file that exists", () => {
    for (const icon of manifest.icons) {
      expect(() => repoFile(`public${icon.src}`)).not.toThrow();
    }
  });

  it("is linked from the document, or nothing above matters", () => {
    const html = repoFile("index.html");
    expect(html).toMatch(/rel="manifest"\s+href="\/manifest\.webmanifest"/);
    expect(html).toMatch(/rel="apple-touch-icon"/);
  });
});
