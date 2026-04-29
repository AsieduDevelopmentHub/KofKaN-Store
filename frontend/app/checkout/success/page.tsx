import { Suspense } from "react";
import { OrderListSkeleton } from "@/components/StorefrontSkeletons";
import { pageMetadata } from "@/lib/seo";
import { CheckoutSuccessClient } from "./CheckoutSuccessClient";

export const metadata = pageMetadata("Order confirmed", {
  description: "Your KofKaN order was placed successfully — confirmation, email, and what happens next.",
  path: "/checkout/success",
});

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="bg-kofkan-cream px-4 py-6 dark:bg-zinc-950">
          <OrderListSkeleton count={1} />
        </main>
      }
    >
      <CheckoutSuccessClient />
    </Suspense>
  );
}
