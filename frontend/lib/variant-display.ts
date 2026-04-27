import type { ProductVariantPublic } from "@/lib/api/product-variants";

/**
 * Professional variant display that formats attributes as "Color: Red, Size: M"
 * instead of the simple "Red · M" format.
 */
export function variantValueSummary(v: ProductVariantPublic): string {
  const attrs = v.attributes as Record<string, unknown> | null | undefined;
  if (!attrs || typeof attrs !== "object") return v.name;
  const parts = Object.keys(attrs)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => {
      const raw = attrs[k];
      const s = raw == null ? "" : String(raw).trim();
      return s.length > 0 ? s : null;
    })
    .filter((x): x is string => x != null);
  return parts.length > 0 ? parts.join(" · ") : v.name;
}

/**
 * Professional variant display with labeled attributes.
 * Returns formatted string like "Color: Red, Size: M"
 */
export function variantDisplayProfessional(v: ProductVariantPublic): string {
  const attrs = v.attributes as Record<string, unknown> | null | undefined;
  if (!attrs || typeof attrs !== "object") return v.name;

  const entries = Object.entries(attrs)
    .filter(([, value]) => value != null && String(value).trim().length > 0)
    .map(([key, value]) => {
      const prettyKey = key
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return `${prettyKey}: ${String(value).trim()}`;
    });

  return entries.length > 0 ? entries.join(", ") : v.name;
}

/**
 * Compact variant display for cart/order summaries.
 * Returns formatted string like "Red, M" (without labels for brevity)
 */
export function variantDisplayCompact(v: ProductVariantPublic): string {
  const attrs = v.attributes as Record<string, unknown> | null | undefined;
  if (!attrs || typeof attrs !== "object") return v.name;

  const values = Object.values(attrs)
    .filter((value) => value != null && String(value).trim().length > 0)
    .map((value) => String(value).trim());

  return values.length > 0 ? values.join(", ") : v.name;
}

/**
 * Invoice-ready variant display with full details.
 * Returns formatted string like "Variant: Color - Red, Size - M"
 */
export function variantDisplayForInvoice(v: ProductVariantPublic): string {
  const attrs = v.attributes as Record<string, unknown> | null | undefined;
  if (!attrs || typeof attrs !== "object") return v.name;

  const entries = Object.entries(attrs)
    .filter(([, value]) => value != null && String(value).trim().length > 0)
    .map(([key, value]) => {
      const prettyKey = key
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return `${prettyKey} - ${String(value).trim()}`;
    });

  return entries.length > 0 ? `Variant: ${entries.join(", ")}` : v.name;
}
