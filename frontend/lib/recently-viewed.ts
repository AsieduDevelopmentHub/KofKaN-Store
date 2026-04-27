/**
 * Tracks the last products a shopper opened so the home page and PDP can
 * surface them in a "Recently viewed" rail.
 *
 * Storage is local-only (guest or signed-in) because the server has no
 * endpoint for this yet and shoppers expect this feature to work offline.
 */

const STORAGE_KEY = "kofkan-recently-viewed";
const MAX_ITEMS = 20;

export type RecentlyViewedEntry = {
  id: string;
  at: number;
};

function readRaw(): RecentlyViewedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is RecentlyViewedEntry =>
          x && typeof x === "object" && typeof x.id === "string" && typeof x.at === "number",
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function writeRaw(entries: RecentlyViewedEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ITEMS)));
  } catch {
    /* quota / disabled storage — silent */
  }
}

export function trackProductView(productId: string): void {
  const id = productId.trim();
  if (!id) return;
  const now = Date.now();
  const existing = readRaw().filter((x) => x.id !== id);
  const next = [{ id, at: now }, ...existing].slice(0, MAX_ITEMS);
  writeRaw(next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("kofkan-recently-viewed"));
  }
}

export function getRecentlyViewedIds(excludeId?: string): string[] {
  return readRaw()
    .filter((x) => x.id !== excludeId)
    .map((x) => x.id);
}

export function clearRecentlyViewed(): void {
  writeRaw([]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("kofkan-recently-viewed"));
  }
}
