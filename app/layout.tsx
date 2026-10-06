import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cẩm Linh & Thái Toàn - Wedding",
  description: "Thiệp cưới online — Cẩm Linh & Thái Toàn",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
