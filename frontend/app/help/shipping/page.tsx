import { HelpArticle } from "@/components/help/HelpArticle";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Shipping & delivery", {
  description: "Delivery regions, fees, dispatch times, and how shipping works on KofKaN Store.",
  path: "/help/shipping",
});

export default function HelpShippingPage() {
  return (
    <HelpArticle title="Shipping & delivery" eyebrow="Help · Shipping">
      <h2>Where we deliver</h2>
      <p>
        We currently dispatch to all 16 regions of Ghana. Delivery fees are calculated during checkout based on your
        region — Greater Accra orders are typically the fastest.
      </p>
      <h2>How long does it take?</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Greater Accra: 1–2 business days.</li>
        <li>Ashanti, Eastern & Central: 2–3 business days.</li>
        <li>Other regions: 3–5 business days via partner couriers.</li>
        <li>Local pickup: ready within 24 hours of payment confirmation.</li>
      </ul>
      <h2>Couriers we use</h2>
      <p>
        We partner with trusted courier services. You&apos;ll pick your preferred courier at checkout, and the rider&apos;s
        contact details are shared with you once the order is dispatched.
      </p>
      <h2>Tracking</h2>
      <p>
        Open your order from <strong>My orders</strong> to see the status timeline. We also send email updates at every
        stage — confirmed, packed, dispatched, and delivered.
      </p>
    </HelpArticle>
  );
}
