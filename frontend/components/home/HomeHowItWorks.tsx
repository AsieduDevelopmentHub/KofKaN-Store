"use client";

import Link from "next/link";
import { FaCart, FaShop, FaTrustLock } from "@/components/FaIcons";

const steps = [
  {
    step: "1",
    title: "Browse",
    body: "Filter by category and discover products tailored to you.",
    href: "/shop",
    cta: "Open shop",
    Icon: FaShop,
  },
  {
    step: "2",
    title: "Choose & add",
    body: "Open a product for full details and pricing, then add to your cart.",
    href: "/shop",
    cta: "Browse products",
    Icon: FaCart,
  },
  {
    step: "3",
    title: "Checkout",
    body: "Review your order and pay securely when you are ready.",
    href: "/cart",
    cta: "Go to checkout",
    Icon: FaTrustLock,
  },
] as const;

export function HomeHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 bg-kofkan-cream px-4 py-7 dark:bg-zinc-950"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-mobile">
        <h2
          id="how-heading"
          className="text-center font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100 sm:text-[1.125rem]"
        >
          Shop in three steps
        </h2>
        <p className="mx-auto mt-2 max-w-[280px] text-center text-small text-kofkan-text-secondary dark:text-zinc-400">
          From discovery to doorstep — a simple flow, built for mobile.
        </p>
        <ol className="mt-6 space-y-4">
          {steps.map(({ step, title, body, href, cta, Icon }) => (
            <li
              key={step}
              className="flex gap-3 rounded-[10px] bg-white p-4 shadow-sm ring-1 ring-black/[0.05] dark:bg-zinc-900 dark:ring-white/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-kofkan-crimson text-small font-bold text-white">
                {step}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon className="text-kofkan-gold" />
                  <p className="font-sans text-body font-semibold text-kofkan-text-primary dark:text-zinc-100">
                    {title}
                  </p>
                </div>
                <p className="mt-1 text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">{body}</p>
                <Link
                  href={href}
                  className="mt-2 inline-block text-small font-semibold text-kofkan-crimson hover:underline"
                >
                  {cta} →
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
