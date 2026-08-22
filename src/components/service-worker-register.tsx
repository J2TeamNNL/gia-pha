"use client";

import { useEffect } from "react";

/**
 * Đăng ký service worker cho app shell (xem `public/sw.js`).
 *
 * Chỉ đăng ký ở production: `next dev` không build ra static export, và cache
 * SW lúc dev sẽ gây nhầm lẫn với HMR. Không render gì — không ảnh hưởng UI.
 */
export function ServiceWorkerRegister(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err: unknown) => {
        // Không phải lỗi chặn app — offline-first vẫn hoạt động qua persist()
        // đã gọi ở src/db/client.ts, chỉ là không có cache app-shell.
        console.error("Không đăng ký được service worker:", err);
      });
  }, []);

  return null;
}
