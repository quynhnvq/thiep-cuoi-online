import { getWeddingApiBaseUrl, readApiError } from "@/lib/wedding/api";

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

export type UpdateWeddingWishInput = {
  name?: string;
  message?: string;
  willAttend?: boolean;
  isPublic?: boolean;
};

type WishesResponse = {
  total: number;
  offset: number;
  limit: number;
  data: WeddingWish[];
};

export type WeddingWishPage = WishesResponse;

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

  const data = (await response.json()) as WishesResponse;
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
    throw new Error(
      await readApiError(response, "Không gửi được lời chúc. Vui lòng thử lại."),
    );
  }
}

export async function fetchAdminWeddingWishes(
  offset = 0,
  limit = 20,
): Promise<WeddingWishPage> {
  const response = await fetch(
    `${getWeddingApiBaseUrl()}/wedding/wishes/admin?offset=${offset}&limit=${limit}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(
      await readApiError(response, "Không tải được danh sách lời chúc."),
    );
  }

  const data = (await response.json()) as WishesResponse;
  return {
    total: data.total ?? 0,
    offset: data.offset ?? offset,
    limit: data.limit ?? limit,
    data: Array.isArray(data.data) ? data.data : [],
  };
}

export async function updateWeddingWish(
  id: string,
  input: UpdateWeddingWishInput,
): Promise<void> {
  const response = await fetch(
    `${getWeddingApiBaseUrl()}/wedding/wishes/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response, "Không cập nhật được lời chúc."));
  }
}

export async function deleteWeddingWish(id: string): Promise<void> {
  const response = await fetch(
    `${getWeddingApiBaseUrl()}/wedding/wishes/${id}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response, "Không xóa được lời chúc."));
  }
}
