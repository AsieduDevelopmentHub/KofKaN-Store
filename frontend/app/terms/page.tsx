import Link from "next/link";
import { ScreenHeader } from "@/components/ScreenHeader";
import { pageMetadata } from "@/lib/seo";
import { KOFKAN_LOCATION_LINE } from "@/lib/site";

export const metadata = pageMetadata("Terms of Service", {
  description:
    "Terms and conditions for using KofKaN Store — orders, payments, shipping, returns, and acceptable use.",
  path: "/terms",
});

const UPDATED = "April 2026";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-kofkan-cream dark:bg-zinc-950">
      <ScreenHeader variant="inner" title="Terms of Service" left="back" backHref="/" right="none" />
      <article className="mx-auto max-w-mobile px-5 py-8 pb-16 text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">
        <header className="mb-8 border-b border-kofkan-gray-soft pb-6 dark:border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted dark:text-zinc-500">
            KofKaN Store
          </p>
          <h1 className="mt-2 font-serif text-[1.35rem] font-semibold text-kofkan-text-primary dark:text-zinc-100">
            Terms of Service
          </h1>
          <p className="mt-2 text-kofkan-text-muted dark:text-zinc-500">Last updated: {UPDATED}</p>
          <p className="mt-4 text-body text-kofkan-text-primary dark:text-zinc-300">
            These terms govern your use of our website, mobile experience, and related services. By accessing or using
            KofKaN Store, you agree to these terms. If you do not agree, please do not use our services.
          </p>
        </header>

        <div className="space-y-10">
          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              1. Who we are
            </h2>
            <p className="mt-3">
              “KofKaN,” “we,” “us,” and “our” refer to KofKaN Store, operating retail and e-commerce services for
              embedded systems, robotics, and programming components — including microcontrollers, sensors, motors,
              power modules, and prototyping tools. Our public-facing location line is {KOFKAN_LOCATION_LINE}. For
              questions about these terms, use the contact options described in your order communications or the help
              section of the app.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              2. Eligibility and your account
            </h2>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li>You must be able to enter a binding agreement under the laws that apply to you.</li>
              <li>
                You are responsible for keeping your login credentials confidential and for all activity under your
                account.
              </li>
              <li>
                You agree to provide accurate information when you register, place an order, or contact us. We may
                suspend or close accounts that misuse the service, commit fraud, or violate these terms.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              3. Products, descriptions, and availability
            </h2>
            <p className="mt-3">
              We aim to describe products, images, and prices accurately. Minor variations in colour or appearance may
              occur (for example due to screen settings). If an item is unavailable after you order, we will notify you
              and offer a reasonable alternative, reschedule, or cancellation and refund of amounts paid for the
              unavailable item, consistent with our processes at the time.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              4. Orders, pricing, and payment
            </h2>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li>
                Displaying a product does not guarantee it is in stock. An order is an offer to purchase; we may accept
                or decline it (for example for fraud prevention, stock, or legal reasons).
              </li>
              <li>
                Prices are shown in the currency indicated at checkout (for example GHS) unless stated otherwise. Taxes,
                duties, or delivery fees may apply and will be shown before you confirm payment where possible.
              </li>
              <li>
                Payment is processed through our chosen payment partners. You authorise us and those partners to charge
                your selected payment method for the total amount shown at checkout.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              5. Delivery, pickup, and risk
            </h2>
            <p className="mt-3">
              Delivery or pickup options, timelines, and fees are communicated at checkout or in your order confirmation.
              Risk of loss for physical goods passes to you when the carrier records delivery or when you collect the
              order, according to the method you selected. If a shipment is delayed or lost, contact us promptly so we can
              help trace it with the carrier.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              6. Returns, refunds, and hygiene
            </h2>
            <p className="mt-3">
              Where the law or our published return policy allows, you may return eligible items within the stated
              period. Components that have been soldered, modified, or installed into a circuit, opened static-sensitive
              parts, custom-cut PCBs, software licences, and items marked non-returnable may not be eligible unless they
              are faulty or not as described. Refunds are processed using the same path as the original payment where
              practicable.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              7. Acceptable use
            </h2>
            <p className="mt-3">You agree not to:</p>
            <ul className="mt-2 list-inside list-disc space-y-2">
              <li>Use the service for unlawful purposes or to harm others;</li>
              <li>Attempt to gain unauthorised access to our systems, accounts, or data;</li>
              <li>Scrape, overload, or interfere with the normal operation of the site or app;</li>
              <li>Mislead us or payment providers about identity, payment, or order details.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              8. Intellectual property
            </h2>
            <p className="mt-3">
              Content on the service (including branding, text, graphics, and layout) is owned by KofKaN or our
              licensors. You may not copy, modify, or exploit it for commercial use without our written permission,
              except as allowed by law or for personal, non-commercial browsing and ordering.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              9. Disclaimer and limit of liability
            </h2>
            <p className="mt-3">
              To the fullest extent permitted by law, the service is provided “as is.” We do not warrant uninterrupted or
              error-free operation. We are not liable for indirect or consequential losses, or for loss of profit, data,
              or goodwill, except where the law does not allow that exclusion. Our total liability arising from these
              terms or your use of the service is limited to the amount you paid us for the specific order giving rise to
              the claim (or, if none, a reasonable cap consistent with applicable law).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              10. Changes
            </h2>
            <p className="mt-3">
              We may update these terms from time to time. The “Last updated” date will change when we do. Continued use
              after changes means you accept the revised terms. If you do not agree, you should stop using the service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              11. Governing law and disputes
            </h2>
            <p className="mt-3">
              These terms are governed by the laws of the Republic of Ghana, without regard to conflict-of-law rules that
              would apply another jurisdiction. Courts in Ghana have non-exclusive jurisdiction over disputes, subject to
              any mandatory consumer protections where you live.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              12. Privacy
            </h2>
            <p className="mt-3">
              Our collection and use of personal data is described in our{" "}
              <Link href="/privacy" className="font-semibold text-kofkan-gold underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>

        <p className="mt-12 border-t border-kofkan-gray-soft pt-8 text-[11px] text-kofkan-text-muted dark:border-white/10 dark:text-zinc-500">
          This document is provided for general business use. Have it reviewed by qualified legal counsel for your
          specific situation, regulatory requirements, and jurisdictions.
        </p>

        <p className="mt-6">
          <Link href="/" className="font-semibold text-kofkan-gold underline-offset-2 hover:underline">
            Back to home
          </Link>
        </p>
      </article>
    </main>
  );
}
