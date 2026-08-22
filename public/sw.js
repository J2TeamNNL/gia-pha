/**
 * Service worker: cache app shell để chạy offline.
 *
 * BỐN RÀO AN TOÀN DỮ LIỆU (xem docs/sync-durability.md §4.4) — không được vi phạm
 * khi sửa file này:
 *
 * 1. Document (navigation) và JS/CSS: KHÔNG BAO GIỜ cache-first vĩnh viễn.
 *    Dùng network-first — luôn thử mạng trước, chỉ dùng cache khi mạng lỗi/offline.
 * 2. Tự cập nhật: CACHE_VERSION đổi thủ công mỗi khi đổi asset bất biến (xem dưới);
 *    activate() xoá cache phiên bản cũ; skipWaiting() + clients.claim() để bản mới
 *    có hiệu lực ngay, không kẹt user ở bản cũ.
 * 3. KHÔNG đụng IndexedDB. File này không import, không mở `indexedDB.open`,
 *    không xoá gì — dữ liệu gia phả nằm trong IndexedDB, ngoài phạm vi service
 *    worker hoàn toàn.
 * 4. `sql-wasm.wasm` (~1.5MB, không đổi tên theo hash) cache theo key có
 *    CACHE_VERSION — đổi version thì cache cũ bị dọn ở activate(), không phục vụ
 *    wasm cũ cho code mới.
 *
 * ĐỔI CACHE_VERSION khi: nâng version `sql.js` (package.json), hoặc đổi icon/manifest.
 */
const CACHE_VERSION = "v1";

// Phiên bản sql.js mà cache "v1" này phục vụ. `tests/pwa.test.ts` so nó với
// package.json và LÀM ĐỎ TEST nếu lệch — nâng sql.js mà quên bump CACHE_VERSION
// sẽ khiến code mới nhận wasm cũ, nên biến việc nhớ đó thành việc máy kiểm.
const SQLJS_VERSION = "1.14.0";
const CACHE_NAME = `gia-pha-shell-${CACHE_VERSION}-sqljs${SQLJS_VERSION}`;

// Asset bất biến, an toàn cache-first (không phải document, không phải JS logic).
const CACHE_FIRST_PATHS = [
  "/sql-wasm.wasm",
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
      .then((cache) => cache.addAll(CACHE_FIRST_PATHS))
      .catch(() => {
        // Offline lúc install (hiếm) — không chặn install, sẽ cache dần lúc fetch.
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

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // Không cache/ghi đè non-GET.

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Không đụng request bên ngoài.

  if (CACHE_FIRST_PATHS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Document + JS/CSS + mọi thứ còn lại: network-first, không bao giờ cache-first.
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
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}
