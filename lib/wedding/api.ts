export function getWeddingApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_WEDDING_API_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("Missing NEXT_PUBLIC_WEDDING_API_URL");
  }
  return base;
}

export async function readApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string | string[] };
    if (typeof data.message === "string") return data.message;
    if (Array.isArray(data.message)) return data.message.join(", ");
  } catch {
    // keep fallback
  }
  return fallback;
}
