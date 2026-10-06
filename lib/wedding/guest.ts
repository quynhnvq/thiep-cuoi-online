/** Guest name from URL: `?name=Nguyễn Văn A` (preferred) or `?id=` (plain / base64). */

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function decodeGuestParam(raw: string | null | undefined): string {
  if (!raw) return "Quý Khách";

  const trimmed = raw.trim();
  if (!trimmed) return "Quý Khách";

  let name = trimmed;

  // Prefer plain UTF-8 name (after URL decoding by the browser / Next).
  // If it looks like base64 (original eWedding format), decode it.
  if (/^[A-Za-z0-9_-]+={0,2}$/.test(trimmed) && !/\s/.test(trimmed)) {
    try {
      let base64 = trimmed.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4 !== 0) base64 += "=";
      const binary = atob(base64);
      const decoded = decodeURIComponent(
        Array.from(binary, (c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""),
      );
      if (decoded) name = decoded;
    } catch {
      // keep plain text
    }
  } else {
    try {
      name = decodeURIComponent(trimmed);
    } catch {
      name = trimmed;
    }
  }

  return escapeHtml(name);
}

export function guestFromSearchParams(
  params: URLSearchParams | { get: (key: string) => string | null },
): string {
  return decodeGuestParam(params.get("name") ?? params.get("id"));
}
