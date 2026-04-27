import { pageMetadata } from "@/lib/seo";
import { CheckoutPageClient } from "./CheckoutPageClient";

export const metadata = pageMetadata("Checkout", {
  description: "Review shipping, delivery, and pay securely with Paystack — cards, bank transfer, and mobile money where supported.",
  path: "/checkout",
});

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
