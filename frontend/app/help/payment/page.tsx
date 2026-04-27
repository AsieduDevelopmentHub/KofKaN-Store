import { HelpArticle } from "@/components/help/HelpArticle";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Payment & security", {
  description: "Paystack checkout, cards, mobile money, receipts, and how we keep payments safe on KofKaN.",
  path: "/help/payment",
});

export default function HelpPaymentPage() {
  return (
    <HelpArticle title="Payment & security" eyebrow="Help · Payment">
      <h2>Payment methods</h2>
      <p>
        We use <strong>Paystack</strong> to process all payments. You can pay with:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Visa, Mastercard, Verve</li>
        <li>Mobile Money (MTN, Vodafone, AirtelTigo)</li>
        <li>Direct bank transfer</li>
        <li>USSD</li>
      </ul>
      <h2>Is it safe?</h2>
      <p>
        KofKaN never sees or stores your card details. Paystack is PCI-DSS Level 1 certified. Every checkout session is
        encrypted end-to-end and protected with 3-D Secure where applicable.
      </p>
      <h2>Receipts & invoices</h2>
      <p>
        A receipt email is sent the moment payment is confirmed. You can also download an official PDF invoice from your
        order details page.
      </p>
      <h2>Failed payments</h2>
      <p>
        If a payment fails, your order remains open with the status <em>pending</em>. Open it from <strong>My orders</strong>{" "}
        and tap <strong>Pay now</strong> to try again with the same or a different payment channel.
      </p>
    </HelpArticle>
  );
}
