"use client";

import { PRODUCT_GRID_CLASS } from "@/lib/storefront-layout";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`kofkan-skeleton ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[10px] bg-white ring-1 ring-black/[0.05] dark:bg-zinc-900 dark:ring-white/10">
      <SkeletonBlock className="aspect-square w-full" />
      <div className="space-y-2 p-2.5 pb-11">
        <SkeletonBlock className="h-3 w-5/6 rounded" />
        <SkeletonBlock className="h-3 w-2/3 rounded" />
        <SkeletonBlock className="h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className={`mt-5 ${PRODUCT_GRID_CLASS}`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <ProductCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

export function ProductRowSkeleton() {
  return (
    <div className="flex min-h-[168px] overflow-hidden rounded-[10px] bg-white ring-1 ring-black/[0.05] dark:bg-zinc-900 dark:ring-white/10">
      <SkeletonBlock className="min-h-[168px] w-[40%] shrink-0" />
      <div className="flex flex-1 flex-col justify-center gap-2 px-3 py-3 sm:px-4">
        <SkeletonBlock className="h-3 w-3/4 rounded" />
        <SkeletonBlock className="h-3 w-1/2 rounded" />
        <SkeletonBlock className="h-3 w-1/3 rounded" />
      </div>
    </div>
  );
}

export function ProductListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="mt-5 space-y-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <ProductRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[10px] bg-white p-4 ring-1 ring-black/[0.05] dark:bg-zinc-900 dark:ring-white/10">
      <div className="flex items-center justify-between gap-2">
        <SkeletonBlock className="h-3 w-24 rounded" />
        <SkeletonBlock className="h-5 w-16 rounded-full" />
      </div>
      <div className="mt-3 flex gap-3">
        <SkeletonBlock className="h-[72px] w-[72px] shrink-0 rounded-[10px]" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-2.5 w-20 rounded" />
          <SkeletonBlock className="h-3 w-5/6 rounded" />
          <SkeletonBlock className="h-3 w-2/3 rounded" />
          <SkeletonBlock className="h-3 w-1/2 rounded" />
        </div>
      </div>
    </div>
  );
}

export function OrderListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mx-auto max-w-mobile space-y-3 px-4 pb-6" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <OrderCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="bg-kofkan-cream px-4 py-4 dark:bg-zinc-950" aria-hidden>
      <div className="mx-auto max-w-mobile space-y-3">
        <SkeletonBlock className="aspect-square w-full rounded-[12px]" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="aspect-square w-full rounded-[10px]" />
          ))}
        </div>
        <SkeletonBlock className="h-5 w-3/4 rounded" />
        <SkeletonBlock className="h-4 w-1/3 rounded" />
        <SkeletonBlock className="h-20 w-full rounded-[10px]" />
      </div>
    </div>
  );
}
