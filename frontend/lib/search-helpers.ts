import type { MockProduct } from "@/lib/mock-data";

export type SortKey = "relevance" | "price-asc" | "price-desc" | "name" | "rating";

export function matchesQuery(p: MockProduct, q: string): boolean {
  if (!q) return true;
  const t = q.toLowerCase();
  return (
    p.name.toLowerCase().includes(t) ||
    p.description.toLowerCase().includes(t) ||
    p.categoryLabel.toLowerCase().includes(t)
  );
}

export function sortProducts(list: MockProduct[], key: SortKey): MockProduct[] {
  const next = [...list];
  if (key === "price-asc") next.sort((a, b) => a.price - b.price);
  else if (key === "price-desc") next.sort((a, b) => b.price - a.price);
  else if (key === "name") next.sort((a, b) => a.name.localeCompare(b.name));
  else if (key === "rating") next.sort((a, b) => b.rating - a.rating);
  return next;
}

export function filterByPriceAndRating(
  list: MockProduct[],
  opts: { min?: number; max?: number; minRating?: number; inStockOnly?: boolean },
): MockProduct[] {
  return list.filter((p) => {
    if (opts.min != null && p.price < opts.min) return false;
    if (opts.max != null && p.price > opts.max) return false;
    if (opts.minRating != null && p.rating < opts.minRating) return false;
    if (opts.inStockOnly && typeof p.in_stock === "number" && p.in_stock <= 0) return false;
    return true;
  });
}

const STORAGE_KEY = "kofkan-recent-searches";
const MAX = 8;

export function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, MAX);
  } catch {
    return [];
  }
}

export function addRecentSearch(term: string): void {
  const t = term.trim();
  if (!t || typeof window === "undefined") return;
  const prev = readRecentSearches().filter((x) => x.toLowerCase() !== t.toLowerCase());
  const next = [t, ...prev].slice(0, MAX);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* silent */
  }
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* silent */
  }
}

/** Popular searches shown before the user types. KofKaN focuses on embedded systems and robotics. */
export const TRENDING_SEARCHES: string[] = [
  "Arduino UNO",
  "ESP32",
  "Raspberry Pi",
  "ultrasonic sensor",
  "servo motor",
  "breadboard",
  "jumper wires",
  "soldering iron",
];
