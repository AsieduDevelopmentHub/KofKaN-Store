"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/context/AuthContext";
import { ordersDetail, type OrderDetail } from "@/lib/api/orders";
import { paystackVerify } from "@/lib/api/payments";
import { formatGhs } from "@/lib/mock-data";

export function CheckoutSuccessClient() {
  const params = useSearchParams();
  const router = useRouter();
  const orderParam = params.get("order");
  const paidRef = params.get("reference") ?? params.get("trxref");
  const orderId = Number.parseInt(orderParam ?? "", 10);
  const idValid = Number.isFinite(orderId) && orderId > 0;
  const { user, accessToken, loading: authLoading } = useAuth();

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [status, setStatus] = useState<"verifying" | "verified" | "pending" | "failed">(
    paidRef ? "verifying" : "pending",
  );
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !idValid) return;
    try {
      const d = await ordersDetail(accessToken, orderId);
      setDetail(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load order");
    }
  }, [accessToken, orderId, idValid]);

  useEffect(() => {
    if (authLoading) return;
    if (!accessToken) return;
    void load();
  }, [authLoading, accessToken, load]);

  useEffect(() => {
    if (!paidRef || !accessToken || !idValid) return;
    const doneKey = `kofkan-ps-verify-${paidRef}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(doneKey)) {
      setStatus("verified");
      void load();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const v = await paystackVerify(accessToken, paidRef);
        if (cancelled) return;
        if (typeof window !== "undefined") sessionStorage.setItem(doneKey, "1");
        setStatus(v.status === "success" || v.already_confirmed ? "verified" : "pending");
        await load();
      } catch (e) {
        if (cancelled) return;
        setStatus("failed");
        setErr(e instanceof Error ? e.message : "Could not verify payment");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paidRef, accessToken, idValid, load]);

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
        <ScreenHeader variant="inner" title="Order" left="back" backHref="/" right="none" />
        <p className="mx-auto max-w-mobile px-4 py-10 text-center text-body text-kofkan-text-secondary dark:text-zinc-400">
          Sign in to see your order.
        </p>
        <div className="text-center">
          <button
            type="button"
            className="mt-2 rounded-[10px] bg-kofkan-gold px-4 py-2.5 text-small font-semibold text-white"
            onClick={() => router.push("/account")}
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-kofkan-cream pb-10 dark:bg-zinc-950">
      <ScreenHeader variant="inner" title="Order confirmed" left="back" backHref="/orders" right="none" />
      <div className="mx-auto max-w-mobile space-y-4 px-4 pt-4">
        <section className="rounded-[12px] bg-white p-6 text-center shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
            ✓
          </div>
          <h1 className="mt-3 font-serif text-[1.35rem] font-semibold text-kofkan-text-primary dark:text-zinc-100">
            {status === "verified"
              ? "Payment confirmed"
              : status === "verifying"
                ? "Verifying your payment…"
                : status === "failed"
                  ? "Order placed, payment pending"
                  : "Thanks for your order!"}
          </h1>
          <p className="mt-2 text-small text-kofkan-text-secondary dark:text-zinc-400">
            {idValid ? (
              <>
                Reference: <span className="font-mono">#{orderId}</span>
              </>
            ) : (
              "Your order was created."
            )}
          </p>
          {err && (
            <p className="mt-3 rounded-[10px] bg-red-50 px-3 py-2 text-small text-red-900 dark:bg-red-950/40 dark:text-red-100">
              {err}
            </p>
          )}
        </section>

        {detail && (
          <section className="rounded-[12px] bg-white p-4 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted dark:text-zinc-500">
              Summary
            </h2>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-small">
              <dt className="text-kofkan-text-secondary dark:text-zinc-400">Items</dt>
              <dd className="text-right text-kofkan-text-primary dark:text-zinc-100">
                {detail.items.reduce((s, l) => s + l.quantity, 0)}
              </dd>
              <dt className="text-kofkan-text-secondary dark:text-zinc-400">Total</dt>
              <dd className="text-right font-semibold text-kofkan-text-primary dark:text-zinc-100">
                {formatGhs(detail.total_price)}
              </dd>
            </dl>
          </section>
        )}

        <section className="rounded-[12px] bg-white p-4 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted dark:text-zinc-500">
            Next steps
          </h2>
          <ul className="mt-2 space-y-2 text-small text-kofkan-text-secondary dark:text-zinc-400">
            <li>• We&apos;ve sent a confirmation email with your receipt.</li>
            <li>• You can track the status anytime under your orders.</li>
            <li>• Questions? Reach us from the Help center.</li>
          </ul>
        </section>

        <div className="space-y-2">
          <Link
            href={idValid ? `/orders/${orderId}` : "/orders"}
            className="block rounded-[10px] bg-kofkan-gold py-3 text-center text-small font-semibold text-white"
          >
            View order details
          </Link>
          <Link
            href="/shop"
            className="block rounded-[10px] border border-kofkan-gray-soft bg-white py-3 text-center text-small font-semibold text-kofkan-text-primary dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
