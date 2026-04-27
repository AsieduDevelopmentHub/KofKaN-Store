import { Suspense } from "react";
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
        <main className="bg-kofkan-cream px-4 py-14 text-center text-small text-kofkan-text-secondary">
          Loading cart…
        </main>
      }
    >
      <CartPageClient />
    </Suspense>
  );
}
