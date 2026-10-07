export type CreateWeddingWishInput = {
  name?: string;
  message: string;
  willAttend: boolean;
};

export type WeddingWish = {
  id: string;
  name: string;
  message: string;
  willAttend: boolean;
  isPublic: boolean;
  createdAt?: string;
};

type PublicWishesResponse = {
  total: number;
  offset: number;
  limit: number;
  data: WeddingWish[];
};

function getWeddingApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_WEDDING_API_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("Missing NEXT_PUBLIC_WEDDING_API_URL");
  }
  return base;
}

export async function fetchPublicWeddingWishes(
  limit = 50,
): Promise<WeddingWish[]> {
  const response = await fetch(
    `${getWeddingApiBaseUrl()}/wedding/wishes?offset=0&limit=${limit}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("Không tải được danh sách lời chúc.");
  }

  const data = (await response.json()) as PublicWishesResponse;
  return Array.isArray(data.data) ? data.data : [];
}

export async function createWeddingWish(
  input: CreateWeddingWishInput,
): Promise<void> {
  const payload = {
    message: input.message,
    willAttend: input.willAttend,
    ...(input.name?.trim() ? { name: input.name.trim() } : {}),
  };

  const response = await fetch(`${getWeddingApiBaseUrl()}/wedding/wishes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = "Không gửi được lời chúc. Vui lòng thử lại.";
    try {
      const data = (await response.json()) as { message?: string | string[] };
      if (typeof data.message === "string") detail = data.message;
      else if (Array.isArray(data.message)) detail = data.message.join(", ");
    } catch {
      // keep default message
    }
    throw new Error(detail);
  }
}
