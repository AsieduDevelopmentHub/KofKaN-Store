/** Physical location (home + footer). District omitted for a shorter public line. */
export const KOFKAN_LOCATION_LINE = "New Edubiase, Ashanti Region, Ghana";

/**
 * Public site URL for legal links in emails (optional). Defaults to in-app routes.
 * Example: `https://kofkan.auralenx.com`
 */
export function publicSiteBaseUrl(): string {
  const v = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return v && /^https?:\/\//i.test(v) ? v.replace(/\/$/, "") : "";
}

/** Terms of service — defaults to in-app `/terms` (see `app/terms/page.tsx`). */
export function termsUrl(): string {
  const v = process.env.NEXT_PUBLIC_TERMS_URL?.trim();
  if (v) return v;
  const base = publicSiteBaseUrl();
  return base ? `${base}/terms` : "/terms";
}

/** Privacy policy — defaults to in-app `/privacy` (see `app/privacy/page.tsx`). */
export function privacyUrl(): string {
  const v = process.env.NEXT_PUBLIC_PRIVACY_URL?.trim();
  if (v) return v;
  const base = publicSiteBaseUrl();
  return base ? `${base}/privacy` : "/privacy";
}

/** FAQs — full URL or path. */
export function faqUrl(): string {
  const v = process.env.NEXT_PUBLIC_FAQ_URL?.trim();
  if (v) return v;
  const base = publicSiteBaseUrl();
  return base ? `${base}/faq` : "/faq";
}

/**
 * WhatsApp help link (e.g. https://wa.me/233XXXXXXXXX?text=Hi%20KofKaN).
 * Set `NEXT_PUBLIC_WHATSAPP_HELP_URL` in `.env.local`. Empty = fall back to in-app help only.
 */
export function whatsappHelpUrl(): string {
  const v = process.env.NEXT_PUBLIC_WHATSAPP_HELP_URL?.trim();
  return v && /^https?:\/\//i.test(v) ? v : "";
}
