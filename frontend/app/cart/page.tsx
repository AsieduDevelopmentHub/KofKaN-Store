import { Suspense } from "react";
import { ProductListSkeleton } from "@/components/StorefrontSkeletons";
import { pageMetadata } from "@/lib/seo";
import { CartPageClient } from "./CartPageClient";

export const metadata = pageMetadata("Shopping cart", {
  description: "Review your bag, update quantities, and proceed to secure checkout with Paystack.",
  path: "/cart",
});

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <main className="bg-kofkan-cream px-4 py-6 dark:bg-zinc-950">
          <div className="mx-auto max-w-mobile">
            <ProductListSkeleton count={3} />
          </div>
        </main>
      }
    >
      <CartPageClient />
    </Suspense>
  );
}
