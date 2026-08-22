/**
 * Service worker for the app shell.
 *
 * The point of installing this app is durability, not speed: iOS evicts an
 * uninstalled site's storage after about seven days of disuse, and OPFS is not
 * exempt. An installed PWA is the only way a family's tree survives a quiet
 * fortnight, so this file exists to make the app installable and usable offline.
 *
 * FOUR DATA-SAFETY RAILS — do not break them when editing:
 *
 * 1. Never serve a navigation, or a script, cache-first at a stable URL. Those
 *    go network-first, so a shipped fix reaches people instead of being masked
 *    by a stale shell.
 * 2. Build output under /assets/ carries a content hash in its name, so those
 *    URLs are immutable and safe cache-first: new content means a new URL, never
 *    new bytes at an old one.
 * 3. Never touch stored family data. This file must not open OPFS or IndexedDB
 *    and must not delete anything outside its own caches. The tree lives in
 *    OPFS, with older trees still in IndexedDB, both entirely out of scope here.
 * 4. Bump CACHE_VERSION when the unhashed cached files change — the manifest or
 *    the icons. activate() then drops every older cache.
 */
const CACHE_VERSION = "v1";
const CACHE_NAME = `gia-pha-shell-${CACHE_VERSION}`;

/**
 * Unhashed, immutable-enough files worth having before the first offline open.
 * The hashed build output is not listed: its names are only known at build time
 * and rail 2 already covers it at fetch time.
 */
const PRECACHE_PATHS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_PATHS))
      .catch(() => {
        // Being offline during install is rare and not worth failing over; these
        // files get cached on first fetch instead.
      }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("gia-pha-shell-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** True for build output whose filename carries a content hash. */
function isImmutableAsset(pathname) {
  return pathname.startsWith("/assets/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Writes are never cached, and never replayed.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Someone else's server is not this worker's business.
  if (url.origin !== self.location.origin) return;

  if (isImmutableAsset(url.pathname) || PRECACHE_PATHS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Documents, and anything else at a stable URL, go network-first (rail 1).
  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}
