import Link from "next/link";
import { ScreenHeader } from "@/components/ScreenHeader";
import { pageMetadata } from "@/lib/seo";
import { KOFKAN_LOCATION_LINE } from "@/lib/site";

export const metadata = pageMetadata("Privacy Policy", {
  description:
    "How KofKaN Store collects, uses, and protects your personal information when you shop with us.",
  path: "/privacy",
});

const UPDATED = "April 2026";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-kofkan-cream dark:bg-zinc-950">
      <ScreenHeader variant="inner" title="Privacy Policy" left="back" backHref="/" right="none" />
      <article className="mx-auto max-w-mobile px-5 py-8 pb-16 text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">
        <header className="mb-8 border-b border-kofkan-gray-soft pb-6 dark:border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted dark:text-zinc-500">
            KofKaN Store
          </p>
          <h1 className="mt-2 font-serif text-[1.35rem] font-semibold text-kofkan-text-primary dark:text-zinc-100">
            Privacy Policy
          </h1>
          <p className="mt-2 text-kofkan-text-muted dark:text-zinc-500">Last updated: {UPDATED}</p>
          <p className="mt-4 text-body text-kofkan-text-primary dark:text-zinc-300">
            We respect your privacy. This policy explains what information we collect when you use KofKaN Store
            (our website and related services), how we use it, and the choices you have. Our public location reference is{" "}
            {KOFKAN_LOCATION_LINE}.
          </p>
        </header>

        <div className="space-y-10">
          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              1. Who is responsible
            </h2>
            <p className="mt-3">
              KofKaN Store (“we,” “us”) is responsible for processing personal data described here in connection with
              the services we offer. For data-protection questions, use the contact channel indicated on your order,
              receipt, or in-app help so your message reaches the right team.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              2. Information we collect
            </h2>
            <p className="mt-3 font-medium text-kofkan-text-primary dark:text-zinc-200">You provide directly</p>
            <ul className="mt-2 list-inside list-disc space-y-2">
              <li>
                Account details: for example name, username, optional email, phone number if you provide it, and
                password (stored in hashed form).
              </li>
              <li>Order and delivery details: shipping address, billing information as needed for payment.</li>
              <li>
                Communications: messages you send to support, feedback, or survey responses if we run them.
              </li>
              <li>Marketing preferences: for example newsletter signup if you opt in.</li>
            </ul>
            <p className="mt-4 font-medium text-kofkan-text-primary dark:text-zinc-200">Collected automatically</p>
            <ul className="mt-2 list-inside list-disc space-y-2">
              <li>
                Technical data: device type, browser, approximate location derived from IP where available, and
                timestamps when you use the service.
              </li>
              <li>
                Usage data: pages or screens viewed, actions in the app (for example add-to-cart), and referral sources
                where our analytics tools support that.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              3. How we use your information
            </h2>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li>To create and secure your account and authenticate you.</li>
              <li>To process orders, take payment, arrange delivery or pickup, and provide customer support.</li>
              <li>To send transactional messages (order confirmations, shipping updates, security alerts).</li>
              <li>To improve our products, website, and fraud prevention, including analytics in aggregated or de-identified form where possible.</li>
              <li>To comply with law, respond to lawful requests, and enforce our Terms of Service.</li>
              <li>
                For marketing, only where you have opted in or where applicable law allows (for example existing-customer
                communications with an easy unsubscribe).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              4. Newsletter, price alerts, and product updates
            </h2>
            <p className="mt-3">
              If you opt in to marketing emails (for example via the footer form or your account), we may send you
              messages about new products, restocks, and price drops. These are sent only to addresses that have
              completed the double opt-in flow where we use it, and you can unsubscribe at any time from the link
              in each email, the account newsletter screen, or the dedicated unsubscribe page. This is separate from
              essential messages about your orders, security, and account.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              5. Legal bases (summary)
            </h2>
            <p className="mt-3">
              Where the law requires a “legal basis,” we rely on: performing our contract with you (orders and accounts);
              legitimate interests (security, analytics, improving the service, and direct marketing where balanced against
              your rights); consent where we ask it explicitly (for example marketing cookies or optional emails); and
              legal obligations where we must retain or disclose data.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              6. Sharing and processors
            </h2>
            <p className="mt-3">
              We do not sell your personal data. We share it only as needed to run the business:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-2">
              <li>Payment providers and banks to process transactions.</li>
              <li>Delivery and logistics partners to fulfil orders.</li>
              <li>Email, hosting, and analytics providers under contract and confidentiality obligations.</li>
              <li>Authorities when required by law or to protect rights and safety.</li>
            </ul>
            <p className="mt-3">
              Some providers may process data outside Ghana. Where we use them, we aim to apply appropriate safeguards
              required by law (for example standard contractual clauses or your consent where relevant).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              7. Retention
            </h2>
            <p className="mt-3">
              We keep data only as long as needed for the purposes above: for example order and tax records for periods
              required by law, account data while your account is active and for a reasonable period after closure to
              handle disputes, and marketing logs until you withdraw consent or unsubscribe. Security logs may be kept
              for a limited period to investigate abuse.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              8. Security
            </h2>
            <p className="mt-3">
              We use technical and organisational measures appropriate to the risk, including encryption in transit where
              we control the connection, access controls, and secure handling of credentials. No method of transmission
              over the internet is completely secure; please use a strong, unique password and protect your devices.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              9. Your rights
            </h2>
            <p className="mt-3">
              Depending on where you live, you may have rights to access, correct, delete, or restrict processing of your
              personal data, to object to certain processing, to data portability, and to withdraw consent where processing
              is consent-based. You may also lodge a complaint with a supervisory authority where applicable. To exercise
              rights, contact us through the same channels you use for support; we may need to verify your identity before
              acting.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              10. Cookies and similar technologies
            </h2>
            <p className="mt-3">
              We use cookies or local storage where necessary for login, preferences, cart, and security. Where we use
              optional analytics or marketing cookies, we will align with your choices and applicable law (for example
              consent banners where required).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              11. Children
            </h2>
            <p className="mt-3">
              Our service is directed at adults. If you believe a child has provided personal data without parental
              consent, contact us and we will take steps to delete it where appropriate.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              12. Changes to this policy
            </h2>
            <p className="mt-3">
              We may update this policy from time to time. We will post the new version here and adjust the “Last
              updated” date. For material changes, we may also notify you by email or in-app message where we can reach
              you.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              13. Terms of Service
            </h2>
            <p className="mt-3">
              Use of the service is also governed by our{" "}
              <Link href="/terms" className="font-semibold text-kofkan-gold underline-offset-2 hover:underline">
                Terms of Service
              </Link>
              .
            </p>
          </section>
        </div>

        <p className="mt-12 border-t border-kofkan-gray-soft pt-8 text-[11px] text-kofkan-text-muted dark:border-white/10 dark:text-zinc-500">
          This policy is a practical template for a small e-commerce business. Adapt it with legal advice for Data
          Protection Act, 2012 (Act 843) and other rules that apply to you, and name a formal data controller address if
          required.
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
