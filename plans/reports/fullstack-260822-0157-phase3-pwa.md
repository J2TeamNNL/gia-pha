# Phase 3 — PWA installable

> 2026-08-22. Thực hiện theo `plans/roadmap.md` Phase 3. Verify: `pnpm build` PASS, `pnpm lint` 0 lỗi, `pnpm test` 36/36 PASS (test suite lớn hơn 35 đã nêu trong brief — do agent phase khác chạy song song thêm test, không phải việc của phase này).

## Đã tạo / sửa

- `src/app/manifest.ts` — Next metadata route, `export const dynamic = "force-static"` để tương thích `output: "export"`. name/short_name tiếng Việt, `display: standalone`, `start_url`/`scope: "/"`, `background_color: #fafaf9` (stone-50, khớp `bg-stone-50` của canvas), `theme_color: #292524` (stone-800, khớp header/button đậm nhất đang dùng trong `PersonCard.tsx`/`FamilyTreeCanvas.tsx`).
- `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png` — sinh từ 1 SVG nguồn (không commit SVG, chỉ PNG theo yêu cầu tối giản) bằng `rsvg-convert` (đã có sẵn trên máy, `/opt/homebrew/bin/rsvg-convert`) — **không tải gì từ mạng**. Chủ đề: 3 node tròn nối bằng nhánh (gợi cây gia phả tối giản, node gốc đậm nhất `stone-800`, hai node con `stone-600`, nhánh nối `stone-400`), nền phủ kín canvas `stone-50` (không alpha) nên dùng chung được cho cả maskable và apple-touch-icon (iOS bỏ alpha). Đã render thử ở 48×48 — 3 node + nhánh vẫn đọc được rõ (xem ảnh preview lúc làm, không lưu lại).
- `public/sw.js` — service worker viết tay, 90 dòng.
- `src/components/service-worker-register.tsx` — client component gọi `navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })`, chỉ chạy khi `NODE_ENV === "production"` (tránh cache can thiệp `next dev`/HMR). Lỗi register bắt bằng `.catch` + `console.error`, không throw chặn app.
- `src/app/layout.tsx` — thêm `viewport.themeColor`, `metadata.icons.icon`/`metadata.icons.apple`, mount `<ServiceWorkerRegister />` trong `<body>`.

Không đụng `next.config.ts` — xem mục "Không làm" dưới.

## Chiến lược cache theo loại asset, và vì sao

| Asset | Chiến lược | Vì sao |
|---|---|---|
| Document (navigation, `/index.html`) | network-first | Bắt buộc theo cảnh báo — cache-first document là chính xác cơ chế gây mất dữ liệu ở §4.4 |
| JS/CSS (`/_next/static/**`) | network-first | Theo đúng yêu cầu trong brief, dù Next tự hash tên file JS (về lý thuyết cache-first an toàn với tên có hash) — chọn nhất quán, đơn giản, không có ngoại lệ dễ set sai |
| `sql-wasm.wasm`, manifest, 4 icon PNG | cache-first, key = `gia-pha-shell-${CACHE_VERSION}` | Bất biến, không phải logic app, không phải document. `CACHE_VERSION` (hằng số trong `sw.js`, hiện `"v1"`) phải bump thủ công khi đổi version `sql.js` hoặc đổi icon — đã ghi chú ngay đầu file |
| Request khác origin, non-GET | bỏ qua (`return`, không `respondWith`) | Không cache/ghi đè POST hay request bên thứ ba (dự án không có request bên thứ ba nào — khớp `docs/privacy.md` §1) |

## 4 rào an toàn — bảo đảm bằng cách nào

1. **Không cache-first document/JS**: `CACHE_FIRST_PATHS` là allowlist đóng (`wasm`, manifest, 4 icon) — mọi request khác (bao gồm mọi request `/_next/static/**` và navigation) rơi vào `networkFirst()`. Test bằng cách đọc code: `fetch` handler check `CACHE_FIRST_PATHS.includes(url.pathname)` trước, else luôn `networkFirst`.
2. **Tự cập nhật**: `CACHE_NAME` chứa `CACHE_VERSION`; `activate()` xoá mọi cache `gia-pha-shell-*` khác `CACHE_NAME` hiện tại; `install()` gọi `self.skipWaiting()`, `activate()` gọi `self.clients.claim()` — SW mới có hiệu lực ngay không cần đóng hết tab. Đăng ký kèm `updateViaCache: "none"` để browser luôn tải `sw.js` bằng network khi so sánh byte-diff (không bị HTTP cache che lần update).
3. **Không đụng IndexedDB**: `grep -n indexedDB public/sw.js` chỉ trúng 1 dòng — chính dòng comment mô tả luật này, không có lệnh gọi `indexedDB.open`/`.deleteDatabase` thật nào trong code. SW chỉ gọi Cache Storage API (`caches.*`), hoàn toàn tách khỏi `src/db/client.ts`.
4. **`sql-wasm.wasm` cache theo version**: nằm trong `CACHE_FIRST_PATHS`, dưới `CACHE_NAME` có `CACHE_VERSION` — đổi version thì `activate()` xoá cache cũ (kể cả wasm cũ), lần fetch sau ghi bản mới vào cache mới.

**Đánh đổi đã biết, không phải bug**: `skipWaiting()` activate SW mới ngay cả khi tab cũ vẫn đang chạy JS cũ trong bộ nhớ — nếu host xoá hẳn chunk cũ khi deploy bản mới, tab cũ có thể fetch 404 một JS chunk cũ cho tới khi user reload. Không có UI "nhắc reload" vì `src/app/page.tsx`/header thuộc file ownership của agent khác trong phase này — ghi lại đây để phase sau cân nhắc thêm nếu cần.

## Icon sinh bằng công cụ gì, kiểm chứng thế nào

- Nguồn: 1 file SVG viết tay (3 circle + 3 line, palette `stone`), lưu tạm trong scratchpad, không commit vào repo (chỉ PNG xuất ra được yêu cầu).
- Raster: `rsvg-convert -w W -h H source.svg -o out.png`, có sẵn tại `/opt/homebrew/bin/rsvg-convert` — **offline hoàn toàn**, không có request mạng nào trong quá trình sinh icon.
- Kiểm chứng kích thước + kênh alpha bằng `file` và `sips -g pixelWidth -g pixelHeight -g hasAlpha`:
  - `icon-192.png`: 192×192, RGB, không alpha.
  - `icon-512.png`, `icon-512-maskable.png`: 512×512, RGB, không alpha.
  - `apple-touch-icon.png`: 180×180, RGB, không alpha (đúng khuyến nghị Apple — iOS bỏ kênh alpha, nền phải đặc).
- Nền phủ kín toàn canvas (rect 512×512 fill stone-50) → thoả điều kiện "maskable" (nội dung phải nằm trong safe-zone circle bán kính 80%, đã tính toạ độ: node xa tâm nhất cách tâm ~204px < bán kính an toàn 204.8px).

## Xác nhận `persist()` — vì sao PWA + persist() phải cộng lại

`src/db/client.ts` đã gọi `requestPersistentStorage()` (dòng `void requestPersistentStorage();` trong `openDb()`, hàm định nghĩa cuối file) sau mỗi lần mở DB thành công — xác nhận bằng đọc code, không sửa file này (ngoài phạm vi ownership).

`navigator.storage.persist()` **một mình không đủ**: trên Safari/WebKit, `persist()` gọi từ một trang mở trong tab thường (không phải app đã "Add to Home Screen") thường **bị từ chối âm thầm hoặc không có tác dụng bền** — WebKit gắn "persistent storage" với heuristic engagement + trạng thái standalone/home-screen, không phải một API độc lập cấp quyền qua `Notification.requestPermission()`-style prompt như Chrome. Ngược lại, chỉ cài lên home screen (PWA) mà không gọi `persist()` thì storage vẫn nằm trong nhóm "best-effort", có thể bị dọn dưới áp lực dung lượng dù ít bị dọn theo lịch 7-ngày. Hai cơ chế cộng lại: PWA installable đưa app ra khỏi heuristic "Safari tab không dùng 7 ngày bị xoá storage" của WebKit; `persist()` là lớp yêu cầu rõ ràng bổ sung cho các browser khác (Chrome/Edge) tôn trọng site engagement score. Không có API nào xác nhận "đã persist thành công" đáng tin cậy 100% trên iOS — đây vẫn là giảm nhẹ rủi ro, không loại bỏ hoàn toàn.

## Chưa thể kiểm

- **Không có thiết bị iOS thật** — không xác nhận được hành vi "Add to Home Screen" + full-screen standalone thực tế trên Safari iOS, chỉ xác nhận tĩnh qua `apple-touch-icon` link tag đúng chuẩn trong `index.html` đã build.
- **Không kiểm được Lighthouse PWA audit** trong phiên này (không chạy Chrome headless) — chỉ verify bằng cách đọc trực tiếp `out/manifest.webmanifest`, `out/index.html`, `out/sw.js`, `out/icons/*` sau `pnpm build`.
- **Không kiểm được hành vi update-in-place thực tế** (deploy v1 → v2, quan sát `skipWaiting`/`clients.claim` chạy trên browser thật) — chỉ verify logic bằng đọc code.

## Không làm (và vì sao)

- **Không sửa `next.config.ts`**: cân nhắc thêm `headers()` (theo gợi ý CSP/Cache-Control cho `sw.js` trong doc chính thức Next) nhưng **`headers()` bị bỏ qua hoàn toàn khi `output: "export"`** — không có Next server nào áp header, host tĩnh mới quyết định. Thêm vào sẽ là code chết, gây hiểu nhầm. Nêu ở đây để nếu sau này đổi hosting có server, có thể set `Cache-Control: no-cache` cho `/sw.js` ở tầng đó.
- **Không thêm dependency** (`next-pwa`/`workbox`/`serwist`) — SW tay 90 dòng đủ, và tránh runtime dependency mới theo luật bất biến #2.
- **Không thêm nút "Install App"** dùng key `header.installPwa` — nằm trong `src/app/page.tsx`/header, ngoài file ownership phase này. Ghi lại: key dictionary đã có, đợi phase khác wire vào UI (gợi ý: `beforeinstallprompt` cho Chrome/Edge, và thông báo tay hướng dẫn "Chia sẻ → Thêm vào MH chính" cho Safari iOS vì `beforeinstallprompt` không chạy trên WebKit).

## Câu hỏi chưa giải

1. `CACHE_VERSION` trong `sw.js` là hằng số thủ công — chưa có cơ chế tự động bump theo `package.json`/build hash. Có cần CI check nhắc bump khi `sql.js` version đổi không, hay để nguyên thủ công (rủi ro quên)?
2. Icon hiện tại chỉ 4 file tối thiểu (192/512/512-maskable/apple-180). Có cần thêm `favicon.ico`/16×16/32×32 riêng cho tab browser, hay giữ nguyên `favicon.ico` mặc định của Next đang có sẵn (`out/favicon.ico` đã thấy trong build output, không phải do phase này tạo)?

Status: DONE
Summary: Manifest + 4 icon (sinh offline bằng rsvg-convert) + service worker network-first cho document/JS, cache-first chỉ cho wasm/icon/manifest theo version, không đụng IndexedDB; `pnpm build`/`lint`/`test` đều xanh, đã verify trực tiếp trong `out/`.
Concerns/Blockers: Không có thiết bị iOS thật để kiểm add-to-home-screen; 2 câu hỏi mở ở cuối báo cáo.
