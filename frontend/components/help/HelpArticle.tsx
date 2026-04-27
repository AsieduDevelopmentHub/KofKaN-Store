"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getWhatsAppChatUrl } from "@/lib/contact";

type Props = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
};

export function HelpArticle({ title, eyebrow, children }: Props) {
  return (
    <main className="bg-kofkan-cream pb-10 dark:bg-zinc-950">
      <ScreenHeader variant="inner" title="Help" left="back" backHref="/help" right="none" />
      <div className="mx-auto max-w-mobile px-4 pt-4">
        <nav aria-label="Breadcrumb" className="text-[11px] text-kofkan-text-muted dark:text-zinc-500">
          <ol className="flex items-center gap-1">
            <li>
              <Link href="/" className="hover:text-kofkan-gold">
                Home
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li>
              <Link href="/help" className="hover:text-kofkan-gold">
                Help
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li className="truncate text-kofkan-text-primary dark:text-zinc-200" aria-current="page">
              {title}
            </li>
          </ol>
        </nav>

        {eyebrow ? (
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-kofkan-text-muted dark:text-zinc-500">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 font-serif text-[1.4rem] font-semibold text-kofkan-text-primary dark:text-zinc-100">
          {title}
        </h1>

        <article className="kofkan-prose mt-4 space-y-4 rounded-[12px] bg-white p-5 text-body leading-relaxed text-kofkan-text-secondary shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:text-zinc-300 dark:ring-white/10">
          {children}
        </article>

        <section className="mt-6 rounded-[12px] bg-white p-4 text-center shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
          <p className="text-small font-semibold text-kofkan-text-primary dark:text-zinc-100">Still need help?</p>
          <p className="mt-1 text-small text-kofkan-text-secondary dark:text-zinc-400">
            Our team replies within 24 hours on weekdays.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/help/contact"
              className="rounded-[10px] bg-kofkan-gold px-4 py-2.5 text-small font-semibold text-white"
            >
              Contact support
            </Link>
            <a
              href={getWhatsAppChatUrl()}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-[10px] border border-kofkan-gray-soft bg-white px-4 py-2.5 text-small font-semibold text-kofkan-text-primary dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100"
            >
              Chat on WhatsApp
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
