import { headers } from "next/headers";

/** ISO 3166-1 alpha-2 codes — EEA-focused list for cookie consent banner */
const EU_EEA_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LV",
  "LI",
  "LT",
  "LU",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "CH",
  "GB",
]);

/**
 * Whether to show the cookie preferences bar (EU/EEA visitors on Vercel/Cloudflare,
 * or when NEXT_PUBLIC_FORCE_COOKIE_BANNER=true).
 */
export async function cookieBannerNeeded(): Promise<boolean> {
  if (process.env.NEXT_PUBLIC_FORCE_COOKIE_BANNER === "true") {
    return true;
  }
  try {
    const h = await headers();
    const country =
      h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || h.get("X-App-Country");
    if (country && EU_EEA_CODES.has(country.trim().toUpperCase())) {
      return true;
    }
  } catch {
    /* not in request context */
  }
  return false;
}
