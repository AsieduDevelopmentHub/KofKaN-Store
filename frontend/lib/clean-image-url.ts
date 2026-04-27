export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "webp" | "origin";
}

/**
 * Normalizes image URLs and applies optional transformations for Supabase Storage.
 */
export function cleanImageUrl(
  url?: string | null,
  options?: ImageTransformOptions
): string {
  if (!url) {
    return "/assets/mockups/mockups.png";
  }

  let cleaned = url
    .trim()
    .replace(/\?$/, "")
    .replace(/([^:]\/)\/+/g, "$1");

  if (options && cleaned.includes("supabase.co")) {
    const params = new URLSearchParams();
    if (options.width) params.append("width", options.width.toString());
    if (options.height) params.append("height", options.height.toString());
    if (options.quality) params.append("quality", options.quality.toString());
    if (options.format) params.append("format", options.format);

    const separator = cleaned.includes("?") ? "&" : "?";
    cleaned = `${cleaned}${separator}${params.toString()}`;
  }

  return cleaned;
}