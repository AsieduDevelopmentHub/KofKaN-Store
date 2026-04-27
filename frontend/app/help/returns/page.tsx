import { HelpArticle } from "@/components/help/HelpArticle";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Returns & refunds", {
  description: "Return windows, eligible items, refunds, and how to start a return on KofKaN Store.",
  path: "/help/returns",
});

export default function HelpReturnsPage() {
  return (
    <HelpArticle title="Returns & refunds" eyebrow="Help · Returns">
      <h2>Our return window</h2>
      <p>
        You may return eligible items within <strong>7 days</strong> of delivery. Products must be unused, in original
        packaging, and with proof of purchase.
      </p>
      <h2>What cannot be returned</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Components or modules that show signs of being soldered, modified, or wired into a circuit.</li>
        <li>Static-sensitive parts (ICs, MCUs, sensors) where the anti-static bag has been opened.</li>
        <li>Bulk consumables such as solder wire, jumper wires, heat-shrink, and adhesive once opened.</li>
        <li>Custom-cut PCBs, special-order items, software licences, and clearance items marked <em>final sale</em>.</li>
        <li>Items damaged after delivery through misuse, reverse polarity, over-voltage, or unauthorised repair.</li>
      </ul>
      <h2>How to start a return</h2>
      <p>
        Open the order from <strong>My orders</strong> and tap <strong>Request a return</strong>. Describe what&apos;s
        wrong, choose whether you want a refund or replacement, and submit. We respond within 24 hours on business days.
      </p>
      <h2>Refund method</h2>
      <p>
        Approved refunds are issued to the original payment channel — card, Mobile Money, or bank transfer — within 5
        business days of us receiving the returned item.
      </p>
    </HelpArticle>
  );
}
