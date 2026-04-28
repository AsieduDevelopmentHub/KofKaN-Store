"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ScreenHeader } from "@/components/ScreenHeader";
import { newsletterUnsubscribe } from "@/lib/api/subscriptions";
import { validateEmail } from "@/lib/validation/input";

export default function NewsletterUnsubscribePage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const validationErr = validateEmail(email);
    if (validationErr) {
      setErr(validationErr);
      return;
    }
    setBusy(true);
    try {
      await newsletterUnsubscribe(email.trim());
      setMsg("You have been unsubscribed. You can re-subscribe anytime from the footer.");
      setEmail("");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not unsubscribe right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-kofkan-cream/40 dark:bg-zinc-950">
      <ScreenHeader variant="inner" title="Newsletter" left="back" backHref="/" right="none" />
      <section className="kofkan-storefront-max px-4 py-6">
        <div className="mx-auto max-w-lg rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
          <h1 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
            Unsubscribe from updates
          </h1>
          <p className="mt-2 text-small text-kofkan-text-secondary dark:text-zinc-400">
            Enter your email to stop receiving product launches and price-drop newsletters.
          </p>
          <form className="mt-4 space-y-3" onSubmit={(e) => void onSubmit(e)}>
            <label className="block text-small font-medium text-kofkan-text-secondary dark:text-zinc-300">
              Email address
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-body outline-none ring-kofkan-gold focus:ring-2 dark:border-white/15 dark:bg-zinc-950"
                placeholder="you@example.com"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-kofkan-crimson px-5 py-2.5 text-small font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Processing..." : "Unsubscribe"}
            </button>
            {err ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-small text-red-800 dark:bg-red-950/40 dark:text-red-300">
                {err}
              </p>
            ) : null}
            {msg ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-small text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                {msg}
              </p>
            ) : null}
          </form>
          <p className="mt-4 text-[12px] text-kofkan-text-muted dark:text-zinc-500">
            Need help? Visit{" "}
            <Link href="/help" className="font-semibold text-kofkan-gold hover:underline">
              Help center
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
