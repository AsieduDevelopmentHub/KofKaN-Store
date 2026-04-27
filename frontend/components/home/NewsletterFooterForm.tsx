"use client";

import { useState } from "react";
import Link from "next/link";
import { newsletterSubscribe } from "@/lib/api/subscriptions";
import { validateEmail } from "@/lib/validation/input";

export function NewsletterFooterForm() {
  const [email, setEmail] = useState("");
  const [marketingOk, setMarketingOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="mt-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-kofkan-gold">Newsletter</p>
      <p className="mt-1 text-[11px] leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">
        Occasional drops, restocks, product launches, and price-drop alerts. Unsubscribe anytime.
      </p>
      <p className="mt-1 text-[11px] text-kofkan-text-muted dark:text-zinc-500">
        Already subscribed?{" "}
        <Link href="/newsletter/unsubscribe" className="font-semibold text-kofkan-gold hover:underline">
          Unsubscribe here
        </Link>
        .
      </p>
      <form
        className="mt-3 flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMsg(null);
          const err = validateEmail(email);
          if (err) {
            setMsg(err);
            setBusy(false);
            return;
          }
          if (!marketingOk) {
            setMsg("Please confirm you agree to receive marketing emails.");
            setBusy(false);
            return;
          }
          try {
            await newsletterSubscribe(email.trim(), { marketingOptIn: true });
            setMsg("Thanks — you are on the list.");
            setEmail("");
            setMarketingOk(false);
          } catch (ex) {
            setMsg(ex instanceof Error ? ex.message : "Could not subscribe.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            className="min-w-0 flex-1 rounded-[10px] border-0 bg-kofkan-gray-soft py-2.5 px-3 text-small text-kofkan-text-primary placeholder:text-kofkan-text-muted ring-1 ring-black/[0.06] focus:ring-2 focus:ring-kofkan-gold/50 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:ring-white/10"
          />
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 rounded-[10px] bg-kofkan-gold px-4 py-2.5 text-small font-semibold text-white disabled:opacity-50 hover:bg-kofkan-gold-hover transition-colors"
          >
            {busy ? "…" : "Subscribe"}
          </button>
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-snug text-kofkan-text-secondary dark:text-zinc-400">
          <input
            type="checkbox"
            checked={marketingOk}
            onChange={(e) => setMarketingOk(e.target.checked)}
            className="mt-0.5 shrink-0 rounded border-kofkan-gray-soft text-kofkan-gold focus:ring-kofkan-gold/50"
          />
          <span>
            I agree to receive marketing emails about products, offers, and updates. See our{" "}
            <Link href="/privacy" className="font-semibold text-kofkan-gold hover:underline">
              Privacy policy
            </Link>
            .
          </span>
        </label>
      </form>
      {msg ? <p className="mt-2 text-[11px] text-kofkan-gold font-medium">{msg}</p> : null}
    </div>
  );
}
