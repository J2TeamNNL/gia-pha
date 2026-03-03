import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cội Nguồn — Gia Phả",
  description:
    "Ứng dụng quản lý Gia Phả, lưu trữ cục bộ, bảo mật, cài đặt như app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${geist.className} antialiased`}>{children}</body>
    </html>
  );
}
