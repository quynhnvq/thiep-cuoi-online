import { getWeddingApiBaseUrl, readApiError } from "@/lib/wedding/api";

export type WeddingGuest = {
  id: string;
  name: string;
  code: string;
  url: string;
  createdAt?: string;
};

export type WeddingGuestInput = {
  name: string;
};

export type WeddingGuestPage = {
  total: number;
  offset: number;
  limit: number;
  data: WeddingGuest[];
};

export function buildGuestInviteUrl(code: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  const base = origin.replace(/\/$/, "");
  return `${base}/g/${code}`;
}

export async function fetchWeddingGuests(
  offset = 0,
  limit = 20,
  query = "",
): Promise<WeddingGuestPage> {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  const keyword = query.trim();
  if (keyword) params.set("q", keyword);

  const response = await fetch(
    `${getWeddingApiBaseUrl()}/wedding/guests?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(
      await readApiError(response, "Không tải được danh sách khách mời."),
    );
  }

  const data = (await response.json()) as WeddingGuestPage;
  return {
    total: data.total ?? 0,
    offset: data.offset ?? offset,
    limit: data.limit ?? limit,
    data: Array.isArray(data.data) ? data.data : [],
  };
}

export async function createWeddingGuest(
  input: WeddingGuestInput,
): Promise<void> {
  const response = await fetch(`${getWeddingApiBaseUrl()}/wedding/guests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Không thêm được khách mời."));
  }
}

export async function updateWeddingGuest(
  id: string,
  input: WeddingGuestInput,
): Promise<void> {
  const response = await fetch(
    `${getWeddingApiBaseUrl()}/wedding/guests/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(
      await readApiError(response, "Không cập nhật được khách mời."),
    );
  }
}

export async function deleteWeddingGuest(id: string): Promise<void> {
  const response = await fetch(
    `${getWeddingApiBaseUrl()}/wedding/guests/${id}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response, "Không xóa được khách mời."));
  }
}
