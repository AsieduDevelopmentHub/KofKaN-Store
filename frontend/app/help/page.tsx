import Link from "next/link";
import { ScreenHeader } from "@/components/ScreenHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Help center", {
  description:
    "Shipping, returns, payments, orders, account help, and how to contact KofKaN Store support.",
  path: "/help",
});

const TOPICS = [
  {
    href: "/help/shipping",
    title: "Shipping & delivery",
    blurb: "Regions, delivery fees, dispatch times.",
  },
  {
    href: "/help/returns",
    title: "Returns & refunds",
    blurb: "What can be returned, how, and when.",
  },
  {
    href: "/help/payment",
    title: "Payment & security",
    blurb: "Paystack, cards, Mobile Money, receipts.",
  },
  { href: "/help/orders", title: "Orders & tracking", blurb: "Where your order is and how to track it." },
  { href: "/help/account", title: "Account & privacy", blurb: "Profile, addresses, password, 2FA." },
  { href: "/help/contact", title: "Contact us", blurb: "Email, phone, WhatsApp support." },
];

export default function HelpHubPage() {
  return (
    <main className="bg-kofkan-cream pb-10 dark:bg-zinc-950">
      <ScreenHeader variant="inner" title="Help center" left="back" backHref="/" right="none" />
      <div className="mx-auto max-w-mobile px-4 pt-4">
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-kofkan-text-muted dark:text-zinc-500">
            How can we help?
          </p>
          <h1 className="mt-1 font-serif text-[1.4rem] font-semibold text-kofkan-text-primary dark:text-zinc-100">
            Browse common topics
          </h1>
        </header>
        <ul className="mt-4 grid grid-cols-1 gap-2">
          {TOPICS.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className="kofkan-tap flex items-center justify-between gap-3 rounded-[12px] bg-white px-4 py-3.5 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10"
              >
                <span>
                  <span className="block text-small font-semibold text-kofkan-text-primary dark:text-zinc-100">
                    {t.title}
                  </span>
                  <span className="mt-0.5 block text-small text-kofkan-text-muted dark:text-zinc-500">
                    {t.blurb}
                  </span>
                </span>
                <span aria-hidden className="text-kofkan-text-muted">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
