import { Suspense } from "react";
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
        <main className="min-h-[40vh] bg-kofkan-cream px-4 py-16 text-center text-small text-kofkan-text-secondary dark:bg-zinc-950 dark:text-zinc-400">
          Loading…
        </main>
      }
    >
      <CheckoutSuccessClient />
    </Suspense>
  );
}
