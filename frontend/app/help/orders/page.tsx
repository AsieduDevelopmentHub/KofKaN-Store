import { HelpArticle } from "@/components/help/HelpArticle";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Orders & tracking", {
  description: "Track orders, delivery status, and what to do if something looks wrong on KofKaN Store.",
  path: "/help/orders",
});

export default function HelpOrdersPage() {
  return (
    <HelpArticle title="Orders & tracking" eyebrow="Help · Orders">
      <h2>Order statuses</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Pending</strong> — awaiting payment confirmation.
        </li>
        <li>
          <strong>Confirmed</strong> — payment received and order queued for packing.
        </li>
        <li>
          <strong>Packed</strong> — ready for courier pickup or collection.
        </li>
        <li>
          <strong>Shipped</strong> — handed to the courier.
        </li>
        <li>
          <strong>Out for delivery</strong> — rider is on the way to your address.
        </li>
        <li>
          <strong>Delivered</strong> — order received.
        </li>
      </ul>
      <h2>Where is my order?</h2>
      <p>
        Open <strong>My orders</strong> from the bottom nav. Each order shows the current status, the timeline of what
        has happened, and the courier assigned when available.
      </p>
      <h2>Changing an order</h2>
      <p>
        Contact support within 1 hour of placing the order if you need to change the delivery address or remove an item.
        Once the order is packed, changes are no longer possible — we&apos;d have to cancel and re-create it.
      </p>
    </HelpArticle>
  );
}
