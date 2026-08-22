import type { MetadataRoute } from "next";

// Route được build tĩnh — không có tham số request nào ở đây, nhưng khai báo
// rõ để `output: "export"` (next.config.ts) không nghi ngờ đây là route động.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cội Nguồn — Gia Phả",
    short_name: "Cội Nguồn",
    description:
      "Ứng dụng quản lý Gia Phả, lưu trữ cục bộ, bảo mật, cài đặt như app.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "vi",
    background_color: "#fafaf9",
    theme_color: "#292524",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
