import type { Metadata } from "next";
import "./globals.css";

const title = "Save The Date – Wedding Day";
const description =
  "Trân trọng kính mời bạn đến dự buổi lễ thành hôn của Cẩm Linh - Thái Toàn, cùng chia sẻ niềm vui trong ngày trọng đại này";
const thumbnail = "/wedding/img/thumbnail.webp";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    type: "website",
    locale: "vi_VN",
    title,
    description,
    images: [{ url: thumbnail, width: 1024, height: 537, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [thumbnail],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: browsers/extensions (e.g. __gcrremoteframetoken)
    // inject attributes onto <html> before React hydrates.
    <html lang="vi" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
