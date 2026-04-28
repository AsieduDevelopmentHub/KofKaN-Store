"use client";

import Link from "next/link";
import { FaHeadset, FaLocationPin, FaShop, FaTrustAuthentic, FaTrustLock, FaTrustTruck } from "@/components/FaIcons";
import { KOFKAN_LOCATION_LINE, whatsappHelpUrl } from "@/lib/site";

const values = [
  {
    title: "Genuine components",
    body: "Authentic boards, sensors, and modules — verified for spec, performance, and project reliability.",
    Icon: FaTrustAuthentic,
  },
  {
    title: "Secure checkout",
    body: "Industry-standard encryption keeps your payment details protected.",
    Icon: FaTrustLock,
  },
] as const;

const deliveryOptions = [
  {
    title: "Local pickup",
    body: "Collect from our Accra location — we’ll notify you when your order is ready.",
    Icon: FaShop,
  },
  {
    title: "Nationwide delivery",
    body: "We ship across Ghana. Options and timelines are confirmed at checkout.",
    Icon: FaTrustTruck,
  },
] as const;

/** Single block: why shop here + delivery/pickup + visit us (replaces duplicate trust strips). */
export function HomeTrustAndLogistics() {
  const wa = whatsappHelpUrl();

  return (
    <section
      className="scroll-mt-20 border-y border-kofkan-gray-soft bg-white px-4 py-6 dark:border-white/10 dark:bg-zinc-950"
      aria-labelledby="trust-heading"
    >
      <h2
        id="trust-heading"
        className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100"
      >
        Why KofKaN
      </h2>
      <p className="mt-1 text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">
        Quality embedded gear with clear service — genuine components, safe checkout, and real support for your build.
      </p>

      <ul className="mx-auto mt-5 flex max-w-mobile flex-col gap-4">
        {values.map(({ title, body, Icon }) => (
          <li
            key={title}
            className="flex gap-3 rounded-[10px] bg-kofkan-cream/80 px-3 py-3 ring-1 ring-black/[0.04] dark:bg-zinc-900/80 dark:ring-white/10"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:ring-white/10">
              <Icon className="text-kofkan-gold" />
            </span>
            <div>
              <p className="font-sans text-body font-semibold text-kofkan-text-primary dark:text-zinc-100">{title}</p>
              <p className="mt-1 text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">{body}</p>
            </div>
          </li>
        ))}
        <li className="flex gap-3 rounded-[10px] bg-kofkan-cream/80 px-3 py-3 ring-1 ring-black/[0.04] dark:bg-zinc-900/80 dark:ring-white/10">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:ring-white/10">
            <FaHeadset className="text-kofkan-gold" />
          </span>
          <div>
            <p className="font-sans text-body font-semibold text-kofkan-text-primary dark:text-zinc-100">
              Help when you need it
            </p>
            <p className="mt-1 text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">
              {wa ? (
                <>
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-emerald-800 underline decoration-emerald-600/40 underline-offset-2 dark:text-emerald-300"
                  >
                    WhatsApp
                  </a>
                  {" · "}
                  <Link href="/account" className="font-medium text-kofkan-crimson underline-offset-2 hover:underline">
                    Account &amp; help
                  </Link>
                </>
              ) : (
                <Link href="/account" className="font-medium text-kofkan-crimson underline-offset-2 hover:underline">
                  Account &amp; help
                </Link>
              )}
            </p>
          </div>
        </li>
      </ul>

      <div
        id="delivery"
        className="scroll-mt-20 mt-10 border-t border-kofkan-gray-soft pt-8 dark:border-white/10"
      >
        <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
          Delivery &amp; pickup
        </h2>
        <p className="mt-1 text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">
          Based in the Ashanti Region — choose pickup or delivery nationwide.
        </p>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {deliveryOptions.map(({ title, body, Icon }) => (
            <li
              key={title}
              className="flex gap-3 rounded-[10px] bg-kofkan-cream/90 px-3 py-3.5 ring-1 ring-black/[0.05] dark:bg-zinc-900/90 dark:ring-white/10"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:ring-white/10">
                <Icon className="text-kofkan-gold" />
              </span>
              <div>
                <p className="font-sans text-body font-semibold text-kofkan-text-primary dark:text-zinc-100">{title}</p>
                <p className="mt-1 text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-[10px] bg-kofkan-cream/80 px-4 py-4 ring-1 ring-black/[0.06] dark:bg-zinc-900/80 dark:ring-white/10">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:ring-white/10">
              <FaLocationPin className="text-kofkan-crimson" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-kofkan-text-muted dark:text-zinc-500">
                Visit us
              </p>
              <p className="mt-1 font-sans text-body font-medium leading-snug text-kofkan-text-primary dark:text-zinc-100">
                {KOFKAN_LOCATION_LINE}
              </p>
              <p className="mt-1.5 text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">
                Pickup, advice, or browsing in person — confirm hours before you travel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
