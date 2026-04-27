"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "kofkan_cookie_preferences";

type Stored = { essential: true; analytics: boolean; decidedAt: string };

export function CookieConsentBanner({ required }: { required: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!required) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Stored;
        if (parsed?.decidedAt) return;
      }
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, [required]);

  if (!required || !visible) return null;

  const save = (analytics: boolean) => {
    const payload: Stored = {
      essential: true,
      analytics,
      decidedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-black/[0.08] bg-white/95 px-4 py-4 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm dark:border-white/10 dark:bg-zinc-950/95"
    >
      <div className="kofkan-storefront-max mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-small text-kofkan-text-secondary dark:text-zinc-400">
          <p className="font-semibold text-kofkan-text-primary dark:text-zinc-100">Cookies & privacy</p>
          <p className="mt-1 text-[13px] leading-relaxed">
            We use essential cookies to run the shop and optional analytics to improve your experience. Read our{" "}
            <Link href="/privacy" className="font-semibold text-kofkan-gold hover:underline">
              Privacy policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-kofkan-gray-soft px-4 py-2 text-[13px] font-semibold text-kofkan-text-primary dark:border-white/15 dark:text-zinc-100"
            onClick={() => save(false)}
          >
            Essential only
          </button>
          <button
            type="button"
            className="rounded-full bg-kofkan-crimson px-4 py-2 text-[13px] font-semibold text-white"
            onClick={() => save(true)}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
