import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClientFlow",
  description: "問い合わせから納品までを一元管理する案件管理Webアプリ",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
