"use client";

import { useEffect, useState } from "react";
import {
  getRecentlyViewedIds,
  trackProductView,
} from "@/lib/recently-viewed";
import { useCatalog } from "@/context/CatalogContext";
import type { MockProduct } from "@/lib/mock-data";

/** Subscribes to localStorage changes fired via the `kofkan-recently-viewed` event. */
export function useRecentlyViewedIds(excludeId?: string): string[] {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const read = () => setIds(getRecentlyViewedIds(excludeId));
    read();
    const handler = () => read();
    window.addEventListener("kofkan-recently-viewed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("kofkan-recently-viewed", handler);
      window.removeEventListener("storage", handler);
    };
  }, [excludeId]);

  return ids;
}

export function useRecentlyViewedProducts(excludeId?: string): MockProduct[] {
  const ids = useRecentlyViewedIds(excludeId);
  const { getProduct } = useCatalog();
  const [resolved, setResolved] = useState<MockProduct[]>([]);

  useEffect(() => {
    const items: MockProduct[] = [];
    for (const id of ids) {
      const p = getProduct(id);
      if (p) items.push(p);
    }
    setResolved(items);
  }, [ids, getProduct]);

  return resolved;
}

export { trackProductView };
