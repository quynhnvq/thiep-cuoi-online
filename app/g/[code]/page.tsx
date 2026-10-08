import type { Metadata } from "next";
import { WeddingPage } from "@/components/wedding/WeddingPage";
import { getWeddingApiBaseUrl } from "@/lib/wedding/api";

async function fetchGuestName(code: string): Promise<string | null> {
  if (!/^[a-z0-9]{6}$/i.test(code)) return null;

  try {
    const response = await fetch(
      `${getWeddingApiBaseUrl()}/wedding/guests/invite/${encodeURIComponent(code)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { name?: string };
    const name = data.name?.trim();
    return name || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/g/[code]">): Promise<Metadata> {
  const { code } = await params;
  const name = await fetchGuestName(code);
  return {
    title: name ? `Thân mời ${name}` : "Save The Date – Wedding Day",
  };
}

export default async function GuestInvitePage({
  params,
}: PageProps<"/g/[code]">) {
  const { code } = await params;
  const guestName = await fetchGuestName(code);
  return <WeddingPage guestName={guestName ?? undefined} />;
}
