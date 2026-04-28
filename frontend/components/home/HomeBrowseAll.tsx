"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useCatalog } from "@/context/CatalogContext";
import { productsForHomeCategory } from "@/lib/mock-data";
import { cleanImageUrl } from "@/lib/clean-image-url";


export function HomeBrowseAll() {
  const { categories, products } = useCatalog();

  const rows = useMemo(() => {
    return categories.map((cat) => {
      let count = 0;
      if (cat.key === "bestsellers") {
        count = products.filter((p) => p.rating >= 4.5).length;
      } else {
        count = products.filter((p) => p.category === cat.key || p.category === cat.slug).length;
      }
      return {
        ...cat,
        count,
      };
    });
  }, [categories, products]);

  return (
    <section
      id="categories"
      className="scroll-mt-20 bg-white px-4 py-6 dark:bg-zinc-950 md:px-6 lg:px-8"
      aria-labelledby="browse-all-heading"
    >
      <div className="kofkan-storefront-max">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-kofkan-text-muted dark:text-zinc-500">
              Find what you need
            </p>
            <h2
              id="browse-all-heading"
              className="mt-1 font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100 sm:text-[1.125rem]"
            >
              All collections
            </h2>
            <p className="mt-1 text-small text-kofkan-text-secondary dark:text-zinc-400">
              Browse by category — every aisle in one scroll.
            </p>
          </div>
          <Link
            href="/shop"
            className="shrink-0 text-small font-semibold text-kofkan-crimson underline-offset-2 hover:underline"
          >
            Shop all
          </Link>
        </div>

        <ul className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:overflow-visible lg:grid-cols-5 xl:grid-cols-6 md:gap-4 md:pb-0">
          {rows.map((cat) => {
            const countLabel = cat.count === 1 ? "1 product" : `${cat.count} products`;
            const shopCat = cat.slug === "bestsellers" ? "bestsellers" : cat.slug;
            return (
              <li key={cat.key} className="flex w-[132px] shrink-0 md:w-auto md:min-w-0 md:shrink">
                <Link
                  href={`/shop?cat=${encodeURIComponent(shopCat)}`}
                  className="kofkan-tap flex h-full min-h-[228px] w-full flex-col overflow-hidden rounded-[10px] bg-kofkan-cream ring-1 ring-black/[0.06] transition-shadow hover:shadow-md dark:bg-zinc-900 dark:ring-white/10"
                >
                  <div className="relative aspect-[4/5] w-full shrink-0 bg-zinc-100 dark:bg-zinc-800">
                    <Image
                      src={cleanImageUrl(cat.image)}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width:768px) 132px, (max-width:1024px) 25vw, 180px"
                      unoptimized
                    />
                  </div>
                  <div className="flex min-h-[4.25rem] flex-1 flex-col justify-center px-2 py-2.5 text-center">
                    <p className="line-clamp-2 text-small font-semibold leading-snug text-kofkan-text-primary dark:text-zinc-100">
                      {cat.label}
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-kofkan-text-muted dark:text-zinc-500">
                      {countLabel}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
