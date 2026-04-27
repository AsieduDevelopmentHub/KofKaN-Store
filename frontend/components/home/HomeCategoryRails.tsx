"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCatalog } from "@/context/CatalogContext";
import { HomeProductCarouselCard } from "@/components/home/HomeProductCarouselCard";

const railScroll =
  "flex gap-3 overflow-x-auto px-4 pb-2 md:px-6 lg:px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function HomeCategoryRails() {
  const { homeRailCategoryKeys, getProductsForHomeRail, categories } = useCatalog();

  const labels = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.key, c.label);
      map.set(c.slug, c.label);
    }
    return map;
  }, [categories]);

  return (
    <section className="scroll-mt-20 bg-kofkan-cream py-4 pb-6 dark:bg-zinc-950" aria-label="Shop by category">
      {homeRailCategoryKeys.map((key) => {
        const railProducts = getProductsForHomeRail(key);
        if (railProducts.length === 0) return null;

        const title =
          key === "bestsellers"
            ? "Best Sellers"
            : labels.get(key) ?? key.replace(/-/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());

        const shopCat = key === "bestsellers" ? "bestsellers" : key;

        return (
          <div key={key} className="mb-8 last:mb-0">
            <div className="mb-3 flex items-center justify-between px-4">
              <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
                {title}
              </h2>
              <Link
                href={`/shop?cat=${encodeURIComponent(shopCat)}`}
                className="shrink-0 text-small font-medium text-kofkan-crimson underline-offset-2 hover:underline"
              >
                See all
              </Link>
            </div>
            <div className={railScroll}>
              {railProducts.map((p) => (
                <HomeProductCarouselCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
