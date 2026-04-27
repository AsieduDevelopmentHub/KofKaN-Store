import { getBackendOrigin } from "@/lib/api/client";

/** Same family as catalog: reliable default when product/order image is missing or bad. */
export const ORDER_IMAGE_PLACEHOLDER =
  "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop";

const BOGUS_IMAGE_TOKENS = new Set([
  "string",
  "null",
  "none",
  "undefined",
  "n/a",
  "na",
  "url",
]);

function isPlausibleRelativeImagePath(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (BOGUS_IMAGE_TOKENS.has(t.toLowerCase())) return false;
  if (t.includes("/")) return true;
  return /\.(jpg|jpeg|png|webp|gif|svg|avif)(\?|#|$)/i.test(t);
}

function absoluteUrlLooksInvalid(trimmed: string): boolean {
  try {
    const u = new URL(trimmed);
    const segments = u.pathname.split("/").filter(Boolean);
    const leaf = segments[segments.length - 1] ?? "";
    if (!leaf) return false;
    const base = leaf.split("?")[0] ?? leaf;
    if (BOGUS_IMAGE_TOKENS.has(base.toLowerCase())) return true;
  } catch {
    return true;
  }
  return false;
}

/**
 * Absolute URL safe for `<img src>` (bypasses Next/Image remotePatterns).
 * Treats API placeholders and junk values like the catalog mapper does.
 */
export function resolveMediaUrl(pathOrUrl: string | null | undefined): string {
  const t = pathOrUrl?.trim();
  if (!t) return ORDER_IMAGE_PLACEHOLDER;
  if (t.startsWith("http://") || t.startsWith("https://")) {
    if (absoluteUrlLooksInvalid(t)) return ORDER_IMAGE_PLACEHOLDER;
    return t;
  }
  if (!isPlausibleRelativeImagePath(t)) return ORDER_IMAGE_PLACEHOLDER;
  const origin = getBackendOrigin();
  return `${origin}${t.startsWith("/") ? "" : "/"}${t}`;
}
