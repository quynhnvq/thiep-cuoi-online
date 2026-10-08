import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsApp } from "@/components/settings/SettingsApp";

export const metadata: Metadata = {
  title: "Cài đặt thiệp cưới",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f6f3ee] px-4 py-8 text-[#8a7358]">
          Đang tải…
        </div>
      }
    >
      <SettingsApp />
    </Suspense>
  );
}
