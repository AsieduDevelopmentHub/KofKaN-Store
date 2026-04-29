import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderListSkeleton } from "@/components/StorefrontSkeletons";
import { OrderDetailPageClient } from "@/components/orders/OrderDetailPageClient";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return pageMetadata("Order details", {
    description: `Order #${id} — status, items, delivery, and payment on KofKaN Store.`,
    path: `/orders/${id}`,
  });
}

function DetailFallback() {
  return (
    <main className="bg-kofkan-cream px-4 py-6 dark:bg-zinc-950">
      <OrderListSkeleton count={1} />
    </main>
  );
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense fallback={<DetailFallback />}>
      <OrderDetailPageClient orderIdParam={id} />
    </Suspense>
  );
}
