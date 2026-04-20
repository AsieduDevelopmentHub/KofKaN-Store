"use client";

import { Mail } from "lucide-react";
import { useState } from "react";

import { subscribeNewsletter } from "@/lib/api/subscriptions";

type NewsletterFormProps = {
  variant?: "footer" | "inline";
};

export function NewsletterForm({ variant = "inline" }: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await subscribeNewsletter(email.trim());
      setMessage(res.message);
      setEmail("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not subscribe");
    } finally {
      setBusy(false);
    }
  };

  const compact = variant === "footer";

  return (
    <form onSubmit={(e) => void submit(e)} className={compact ? "mt-4 max-w-md" : "mt-4"}>
      {!compact ? (
        <p className="text-sm font-semibold text-kofkan-black">Newsletter</p>
      ) : (
        <p className="text-xs font-semibold uppercase tracking-wide text-kofkan-muted">Stay updated</p>
      )}
      <div className={`mt-2 flex gap-2 ${compact ? "flex-col sm:flex-row" : "flex-col sm:flex-row"}`}>
        <label className="sr-only" htmlFor="newsletter-email">
          Email
        </label>
        <div className="relative flex-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kofkan-muted" />
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-kofkan-border py-2.5 pl-10 pr-3 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-kofkan-black px-4 py-2.5 text-sm font-semibold text-kofkan-white disabled:opacity-60"
        >
          {busy ? "…" : "Subscribe"}
        </button>
      </div>
      {message ? <p className="mt-2 text-xs text-kofkan-muted">{message}</p> : null}
    </form>
  );
}
