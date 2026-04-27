"use client";

import type { CSSProperties } from "react";

type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
};

const radiusClass: Record<NonNullable<SkeletonProps["rounded"]>, string> = {
  sm: "rounded",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

export function Skeleton({ className = "", style, rounded = "md" }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      style={style}
      className={`block animate-pulse bg-kofkan-gray-soft/90 ${radiusClass[rounded]} ${className}`}
    />
  );
}

export function SkeletonStatCard() {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-5 w-24" />
    </div>
  );
}

export function SkeletonStatGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonChart({ heightClass = "h-48 sm:h-56" }: { heightClass?: string }) {
  return (
    <div className="w-full">
      <div className={`relative w-full overflow-hidden rounded-lg bg-kofkan-gray-soft/40 ${heightClass}`}>
        <div className="absolute inset-0 animate-pulse" />
        <div className="absolute inset-x-6 bottom-6 top-6 flex items-end justify-between gap-1">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="block w-full rounded-t bg-white/70"
              style={{ height: `${30 + ((i * 37) % 60)}%` }}
            />
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Skeleton className="h-2 w-24" />
        <Skeleton className="h-2 w-32" />
      </div>
    </div>
  );
}

export function SkeletonDonut() {
  return (
    <div className="mt-4 flex items-center gap-5">
      <Skeleton rounded="full" className="h-32 w-32" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  );
}

export function SkeletonListRow() {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-5 w-16" rounded="full" />
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="mt-3 divide-y divide-kofkan-gray-soft">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonListRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonTableRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-b border-black/[0.04]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 pr-2">
          <Skeleton className="h-3 w-full max-w-[160px]" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCardBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06] ${className}`}>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-3 w-60" />
      <div className="mt-5 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/** Generic admin data table inside the standard white card shell. */
export function AdminTableSkeleton({
  minWidthClass = "min-w-[640px]",
  columns,
  bodyRows = 6,
  className = "",
}: {
  minWidthClass?: string;
  columns: number;
  bodyRows?: number;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06] ${className}`}>
      <table className={`w-full ${minWidthClass} text-left text-small`}>
        <thead className="border-b border-black/[0.06] text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-3 w-14" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-kofkan-gray-soft">
          {Array.from({ length: bodyRows }).map((_, r) => (
            <tr key={r} className="border-b border-black/[0.04]">
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} className="px-4 py-3">
                  <Skeleton className="h-3 w-full max-w-[160px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminCategoryListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="mt-4 divide-y divide-kofkan-gray-soft rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06]">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-14 rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AdminOrdersPageSkeleton() {
  return (
    <>
      <ul className="mt-6 space-y-3 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-2 h-3 w-3/4" />
              <div className="mt-2 flex items-center justify-between gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-14" />
              </div>
              <Skeleton className="mt-1 h-2 w-36" />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 hidden w-full max-w-full touch-pan-x overflow-x-auto overscroll-x-contain md:block">
        <AdminTableSkeleton minWidthClass="min-w-[720px]" columns={6} />
      </div>
    </>
  );
}

export function AdminProductEditSkeleton() {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1.2fr]">
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-4 aspect-[4/3] w-full rounded-lg" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-kofkan-cream/50 p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="contents">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20 justify-self-end" />
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06]">
        <Skeleton className="h-5 w-36" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </section>
    </div>
  );
}

export function AdminOrderDetailSkeleton() {
  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <Skeleton className="h-4 w-40" />
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="mt-4 h-3 w-56" />
      </section>
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
        <Skeleton className="h-5 w-24" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 border-b border-black/[0.06] pb-4 last:border-0">
              <Skeleton className="h-14 w-14 shrink-0 rounded-[10px]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function AdminReturnsPageSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <article key={i} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </article>
      ))}
    </div>
  );
}

export function AdminSearchAnalyticsSkeleton() {
  return (
    <div className="mt-6 space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-7 w-16" />
          </div>
        ))}
      </div>
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-3 w-72" />
        <div className="mt-4">
          <AdminTableSkeleton minWidthClass="min-w-[640px]" columns={4} />
        </div>
      </div>
      <div>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-3 w-64" />
        <div className="mt-4">
          <AdminTableSkeleton minWidthClass="min-w-[560px]" columns={3} />
        </div>
      </div>
    </div>
  );
}

export function AdminInventoryPageSkeleton() {
  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06] sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        </div>
        <ul className="mt-3 space-y-2 md:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/[0.06]">
              <div className="flex justify-between gap-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-2 h-3 w-24" />
            </li>
          ))}
        </ul>
        <div className="mt-3 hidden md:block">
          <AdminTableSkeleton minWidthClass="min-w-[480px]" columns={4} />
        </div>
      </section>
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        </div>
        <div className="mt-3">
          <AdminTableSkeleton minWidthClass="min-w-[560px]" columns={5} bodyRows={4} />
        </div>
      </section>
    </div>
  );
}

export function AdminPaymentsPageSkeleton() {
  return (
    <>
      <ul className="mt-6 space-y-3 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
            <div className="flex justify-between gap-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="mt-2 h-4 w-3/4" />
            <div className="mt-2 flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 hidden md:block">
        <AdminTableSkeleton minWidthClass="min-w-[860px]" columns={7} />
      </div>
    </>
  );
}

export function AdminStaffListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="mt-3 divide-y divide-kofkan-gray-soft rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06]">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-full max-w-md" />
            <Skeleton className="h-3 w-4/5 max-w-lg" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AdminReviewsListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="mt-6 divide-y divide-kofkan-gray-soft rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06]">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="px-4 py-4">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="mt-2 h-3 w-40" />
          <Skeleton className="mt-3 h-12 w-full" />
        </li>
      ))}
    </ul>
  );
}

export function AdminSettingsPageSkeleton() {
  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06] sm:grid-cols-[1fr_2fr_auto]">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-full justify-self-start sm:justify-self-end" />
      </div>
      <AdminTableSkeleton minWidthClass="min-w-[720px]" columns={3} bodyRows={6} />
    </div>
  );
}

export function AdminCouponsTableSkeleton() {
  return <AdminTableSkeleton minWidthClass="min-w-[740px]" columns={6} />;
}

export function AdminImageGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="relative aspect-square w-full overflow-hidden rounded-lg bg-kofkan-gray-soft/60">
          <Skeleton className="h-full w-full rounded-lg" />
        </li>
      ))}
    </ul>
  );
}

export function AdminVariantRowsSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="mt-4 space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-lg border border-kofkan-gray-soft bg-kofkan-cream/40 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-20 w-20 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3 max-w-xs" />
              <Skeleton className="h-3 w-1/2 max-w-[200px]" />
              <Skeleton className="h-8 w-full max-w-md rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
