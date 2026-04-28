"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/context/AuthContext";
import { ordersDetail, type OrderDetail, type OrderLineItem } from "@/lib/api/orders";
import { returnsCreate, type OrderReturn } from "@/lib/api/returns";
import { formatGhs } from "@/lib/mock-data";
import { sanitizeMultiline } from "@/lib/validation/input";

type Props = { orderIdParam: string };

const REASONS = [
  "Damaged on arrival",
  "Wrong item received",
  "Item doesn't match description",
  "Quality not as expected",
  "Changed my mind",
  "Other (describe below)",
];

const STORAGE_KEY = "kofkan-return-drafts";
const SUPPORT_EMAIL = "support@kofkan.com";

type StoredDraft = {
  orderId: number;
  selectedItems: number[];
  reason: string;
  details: string;
  outcome: "refund" | "replacement";
  submittedAt: string;
};

function readDrafts(): StoredDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveDraft(d: StoredDraft): void {
  if (typeof window === "undefined") return;
  try {
    const all = readDrafts().filter((x) => x.orderId !== d.orderId);
    all.unshift(d);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 20)));
  } catch {
    /* quota — silent */
  }
}

export function OrderReturnRequestClient({ orderIdParam }: Props) {
  const { user, accessToken, loading: authLoading } = useAuth();
  const orderId = Number.parseInt(orderIdParam, 10);
  const idValid = Number.isFinite(orderId) && orderId > 0;

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [outcome, setOutcome] = useState<"refund" | "replacement">("refund");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdReturn, setCreatedReturn] = useState<OrderReturn | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !idValid) return;
    setLoading(true);
    setErr(null);
    try {
      const d = await ordersDetail(accessToken, orderId);
      setDetail(d);
      setSelectedItems(d.items.map((l) => l.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load order");
    } finally {
      setLoading(false);
    }
  }, [accessToken, orderId, idValid]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !accessToken) return;
    void load();
  }, [authLoading, user, accessToken, load]);

  const toggleItem = (id: number) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const buildEmailBody = useMemo(() => {
    if (!detail) return "";
    const lines = detail.items
      .filter((l) => selectedItems.includes(l.id))
      .map((l) => `  · ${l.product_name ?? `Product #${l.product_id}`} (qty ${l.quantity}, ${formatGhs(l.price_at_purchase)})`);
    const cleanedDetails = sanitizeMultiline(details, 2000).trim();
    return [
      `Return request for order #${detail.id}`,
      `Name: ${user?.name ?? ""}`,
      `Email: ${user?.email ?? ""}`,
      `Phone: ${user?.phone ?? ""}`,
      "",
      "Items:",
      ...lines,
      "",
      `Reason: ${reason}`,
      `Preferred outcome: ${outcome}`,
      "",
      "Additional details:",
      cleanedDetails || "(none provided)",
    ].join("\n");
  }, [detail, selectedItems, reason, outcome, details, user]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    if (selectedItems.length === 0) {
      setErr("Select at least one item to return.");
      return;
    }
    setErr(null);

    const cleanedDetails = sanitizeMultiline(details, 2000).trim();
    const draft: StoredDraft = {
      orderId: detail.id,
      selectedItems,
      reason,
      details: cleanedDetails,
      outcome,
      submittedAt: new Date().toISOString(),
    };
    saveDraft(draft);

    if (!accessToken) {
      setErr("Sign in again to submit your return request.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await returnsCreate(accessToken, detail.id, {
        reason,
        details: cleanedDetails || null,
        preferred_outcome: outcome,
        items: detail.items
          .filter((l) => selectedItems.includes(l.id))
          .map((l) => ({ order_item_id: l.id, quantity: l.quantity })),
      });
      setCreatedReturn(created);
      setSubmitted(true);
      setUsedFallback(false);
    } catch (apiErr) {
      // Graceful fallback: drop to mailto so customers never lose a request when the API is unreachable.
      if (typeof window !== "undefined") {
        const subject = encodeURIComponent(`Return request — Order #${detail.id}`);
        const body = encodeURIComponent(buildEmailBody);
        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
      }
      setUsedFallback(true);
      setSubmitted(true);
      if (apiErr instanceof Error && apiErr.message) {
        setErr(
          `We couldn't reach our returns service (${apiErr.message}). Your email app has opened with the request — please send it to ${SUPPORT_EMAIL}.`
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-[40vh] bg-kofkan-cream px-4 py-16 text-center text-small text-kofkan-text-secondary dark:bg-zinc-950 dark:text-zinc-400">
        Loading…
      </main>
    );
  }

  if (!user || !accessToken) {
    return (
      <main className="bg-kofkan-cream dark:bg-zinc-950">
        <ScreenHeader variant="inner" title="Return request" left="back" backHref={`/orders/${orderIdParam}`} right="none" />
        <p className="mx-auto max-w-mobile px-4 py-10 text-center text-small text-kofkan-text-secondary dark:text-zinc-400">
          Sign in to start a return.
        </p>
      </main>
    );
  }

  if (!idValid) {
    return (
      <main className="bg-kofkan-cream dark:bg-zinc-950">
        <ScreenHeader variant="inner" title="Return request" left="back" backHref="/orders" right="none" />
        <p className="mx-auto max-w-mobile px-4 py-10 text-center text-small text-kofkan-text-secondary dark:text-zinc-400">
          Invalid order link.
        </p>
      </main>
    );
  }

  return (
    <main className="bg-kofkan-cream pb-10 dark:bg-zinc-950">
      <ScreenHeader variant="inner" title="Return request" left="back" backHref={`/orders/${orderId}`} right="none" />
      <div className="mx-auto max-w-mobile px-4 pt-4">
        {err && (
          <p className="rounded-[10px] bg-red-50 px-3 py-2 text-small text-red-900 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-100">
            {err}
          </p>
        )}

        {submitted ? (
          <section className="rounded-[12px] bg-white p-6 text-center shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
              ✓
            </div>
            <h1 className="mt-3 font-display text-[1.35rem] font-semibold text-kofkan-text-primary dark:text-zinc-100">
              {usedFallback
                ? "Return request drafted in email"
                : "Return request submitted"}
            </h1>
            <p className="mt-2 text-small text-kofkan-text-secondary dark:text-zinc-400">
              {usedFallback ? (
                <>
                  We opened your email app with the request filled in. Send it to{" "}
                  <strong>{SUPPORT_EMAIL}</strong> and our team will reply within 24
                  business hours.
                </>
              ) : (
                <>
                  Thanks — we&apos;ve logged your request
                  {createdReturn ? ` (reference #${createdReturn.id})` : ""} and our team
                  will reach out within 24 business hours.
                </>
              )}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href={`/orders/${orderId}`}
                className="rounded-[10px] bg-kofkan-gold px-4 py-2.5 text-small font-semibold text-white"
              >
                Back to order
              </Link>
              <Link
                href="/help/returns"
                className="rounded-[10px] border border-kofkan-gray-soft bg-white px-4 py-2.5 text-small font-semibold text-kofkan-text-primary dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100"
              >
                Return policy
              </Link>
            </div>
          </section>
        ) : loading && !detail ? (
          <p className="py-8 text-center text-small text-kofkan-text-secondary dark:text-zinc-400">Loading order…</p>
        ) : detail ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <section className="rounded-[12px] bg-white p-4 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
              <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
                Which items?
              </h2>
              <ul className="mt-3 divide-y divide-kofkan-gray-soft/80 dark:divide-white/10">
                {detail.items.map((l: OrderLineItem) => {
                  const checked = selectedItems.includes(l.id);
                  return (
                    <li key={l.id} className="flex items-start gap-3 py-3 first:pt-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItem(l.id)}
                        className="mt-1 h-4 w-4 accent-kofkan-gold"
                        id={`ret-item-${l.id}`}
                      />
                      <label htmlFor={`ret-item-${l.id}`} className="min-w-0 flex-1 cursor-pointer">
                        <span className="block text-small font-semibold text-kofkan-text-primary dark:text-zinc-100">
                          {l.product_name ?? `Product #${l.product_id}`}
                        </span>
                        <span className="block text-[11px] text-kofkan-text-muted dark:text-zinc-500">
                          Qty {l.quantity} · {formatGhs(l.price_at_purchase)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="rounded-[12px] bg-white p-4 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
              <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
                Reason
              </h2>
              <label className="mt-3 block text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
                What happened?
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                >
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
                Details (optional)
                <textarea
                  rows={4}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe the issue so we can resolve it quickly."
                  className="mt-1 w-full resize-y rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                />
              </label>
              <fieldset className="mt-4 space-y-2">
                <legend className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
                  Preferred outcome
                </legend>
                <label className="flex cursor-pointer items-center gap-2 text-small text-kofkan-text-secondary dark:text-zinc-300">
                  <input
                    type="radio"
                    name="return-outcome"
                    checked={outcome === "refund"}
                    onChange={() => setOutcome("refund")}
                    className="accent-kofkan-gold"
                  />
                  Refund to original payment method
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-small text-kofkan-text-secondary dark:text-zinc-300">
                  <input
                    type="radio"
                    name="return-outcome"
                    checked={outcome === "replacement"}
                    onChange={() => setOutcome("replacement")}
                    className="accent-kofkan-gold"
                  />
                  Replacement for the same item
                </label>
              </fieldset>
            </section>

            <button
              type="submit"
              disabled={submitting}
              className="kofkan-btn-gold kofkan-tap w-full rounded-[10px] py-3.5 text-body font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit request"}
            </button>
            <p className="text-center text-[11px] text-kofkan-text-muted dark:text-zinc-500">
              We&apos;ll log your request securely. If that fails we&apos;ll open your email
              app instead so the request reaches <strong>{SUPPORT_EMAIL}</strong>.
            </p>
          </form>
        ) : null}
      </div>
    </main>
  );
}
