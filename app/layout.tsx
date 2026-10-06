import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cẩm Linh & Thái Toàn - Wedding",
  description: "Thiệp cưới online — Cẩm Linh & Thái Toàn",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full">
      <body className="min-h-full flex flex-col">
        <link rel="stylesheet" href="/wedding/css/animate.css" />
        <link rel="stylesheet" href="/wedding/css/envelope.css" />
        <link rel="stylesheet" href="/wedding/css/main.css" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Taviraj:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Dancing+Script:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap"
        />
        {children}
      </body>
    </html>
  );
}
