"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/context/AuthContext";
import {
  downloadBlobAsFile,
  ordersDetail,
  ordersInvoicePdfBlob,
  type OrderDetail,
} from "@/lib/api/orders";
import { paystackInitialize, paystackVerify } from "@/lib/api/payments";
import { GHANA_REGIONS } from "@/lib/ghana-shipping";
import { OrderProductThumb } from "@/components/orders/OrderProductThumb";
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline";
import { formatGhs } from "@/lib/mock-data";
import { orderStatusLabel, orderStatusPillClass } from "@/lib/order-status-ui";
import { SkeletonBlock } from "@/components/StorefrontSkeletons";

function regionLabel(slug: string | null | undefined): string | null {
  if (!slug?.trim()) return null;
  return GHANA_REGIONS.find((r) => r.slug === slug)?.label ?? slug;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function paymentLabel(s: string | undefined): string {
  const t = (s ?? "pending").trim().toLowerCase();
  if (!t) return "Pending";
  return t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, " ");
}

type Props = { orderIdParam: string };

export function OrderDetailPageClient({ orderIdParam }: Props) {
  const searchParams = useSearchParams();
  const paidRef = searchParams.get("reference") ?? searchParams.get("trxref");
  const { user, accessToken, loading: authLoading } = useAuth();
  const orderId = Number.parseInt(orderIdParam, 10);
  const idValid = Number.isFinite(orderId) && orderId > 0;

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [payBusy, setPayBusy] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !idValid) return;
    setLoading(true);
    setErr(null);
    try {
      const d = await ordersDetail(accessToken, orderId);
      setDetail(d);
    } catch (e) {
      setDetail(null);
      setErr(e instanceof Error ? e.message : "Could not load order");
    } finally {
      setLoading(false);
    }
  }, [accessToken, orderId, idValid]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !accessToken || !idValid) return;
    void load();
  }, [authLoading, user, accessToken, idValid, load]);

  useEffect(() => {
    if (!paidRef || !accessToken || !idValid) return;
    const doneKey = `kofkan-ps-verify-${paidRef}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(doneKey)) {
      window.history.replaceState({}, "", `/orders/${orderId}`);
      void load();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const v = await paystackVerify(accessToken, paidRef);
        if (cancelled) return;
        if (typeof window !== "undefined") sessionStorage.setItem(doneKey, "1");
        setVerifyMsg(
          v.status === "success" || v.already_confirmed
            ? "Payment confirmed. Your receipt is available below."
            : `Payment status: ${v.status}`
        );
        await load();
        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", `/orders/${orderId}`);
        }
      } catch (e) {
        if (!cancelled) setVerifyMsg(e instanceof Error ? e.message : "Could not verify payment");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paidRef, accessToken, orderId, idValid, load]);

  async function onDownloadPdf() {
    if (!accessToken || !idValid) return;
    setPdfBusy(true);
    try {
      const blob = await ordersInvoicePdfBlob(accessToken, orderId);
      downloadBlobAsFile(blob, `invoice_order_${orderId}.pdf`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not download invoice");
    } finally {
      setPdfBusy(false);
    }
  }

  async function onPayNow() {
    if (!accessToken || !detail) return;
    setPayBusy(true);
    setErr(null);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const callbackUrl = `${origin}/orders/${detail.id}`;
      const pay = await paystackInitialize(accessToken, detail.id, callbackUrl);
      if (typeof window !== "undefined" && pay.authorization_url) {
        window.location.href = pay.authorization_url;
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start payment");
    } finally {
      setPayBusy(false);
    }
  }

  if (authLoading) {
    return (
      <main className="bg-kofkan-cream pb-10 dark:bg-zinc-950" aria-hidden>
        <ScreenHeader variant="inner" title={`Order #${orderIdParam}`} left="back" backHref="/orders" right="profile" />
        <div className="mx-auto max-w-mobile space-y-4 px-4 pt-2">
          <div className="rounded-[12px] bg-white p-4 ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
            <SkeletonBlock className="h-5 w-32 rounded-full" />
            <SkeletonBlock className="mt-3 h-3 w-40 rounded" />
          </div>
          <div className="rounded-[12px] bg-white p-4 ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
            <SkeletonBlock className="h-4 w-16 rounded" />
            <div className="mt-3 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <SkeletonBlock className="h-[64px] w-[64px] rounded-[10px]" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBlock className="h-3 w-2/3 rounded" />
                    <SkeletonBlock className="h-3 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user || !accessToken) {
    return (
      <main className="bg-kofkan-cream dark:bg-zinc-950">
        <ScreenHeader variant="inner" title="Order" left="back" backHref="/orders" right="profile" />
        <div className="mx-auto max-w-mobile px-4 py-14 text-center">
          <p className="text-body text-kofkan-text-secondary dark:text-zinc-400">Sign in to view this order.</p>
          <Link href="/account" className="mt-4 inline-block font-semibold text-kofkan-gold hover:underline">
            Account
          </Link>
        </div>
      </main>
    );
  }

  if (!idValid) {
    return (
      <main className="bg-kofkan-cream dark:bg-zinc-950">
        <ScreenHeader variant="inner" title="Order" left="back" backHref="/orders" right="profile" />
        <p className="mx-auto max-w-mobile px-4 py-10 text-center text-small text-kofkan-text-secondary dark:text-zinc-400">
          Invalid order link.
        </p>
      </main>
    );
  }

  return (
    <main className="bg-kofkan-cream pb-10 dark:bg-zinc-950">
      <ScreenHeader
        variant="inner"
        title={`Order #${orderId}`}
        left="back"
        backHref="/orders"
        right="profile"
      />

      <div className="mx-auto max-w-mobile space-y-4 px-4 pt-2">
        {verifyMsg && (
          <p className="rounded-[10px] bg-emerald-50 px-3 py-2.5 text-small text-emerald-900 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-900/40">
            {verifyMsg}
          </p>
        )}

        {err && (
          <p className="rounded-[10px] bg-red-50 px-3 py-2 text-small text-red-800 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-100">
            {err}
          </p>
        )}

        {loading && !detail ? (
          <div className="rounded-[12px] bg-white p-4 ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10" aria-hidden>
            <SkeletonBlock className="h-4 w-32 rounded" />
            <SkeletonBlock className="mt-3 h-3 w-44 rounded" />
            <SkeletonBlock className="mt-2 h-3 w-56 rounded" />
          </div>
        ) : null}

        {detail ? (
          <>
            <section className="rounded-[12px] bg-white p-4 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ${orderStatusPillClass(
                    detail.status
                  )}`}
                >
                  {orderStatusLabel(detail.status)}
                </span>
                <span className="rounded-full bg-kofkan-gray-soft px-2.5 py-1 text-[11px] font-semibold text-kofkan-text-secondary ring-1 ring-black/[0.06] dark:bg-zinc-800 dark:text-zinc-300 dark:ring-white/10">
                  Payment: {paymentLabel(detail.payment_status)}
                </span>
              </div>
              <p className="mt-3 text-small text-kofkan-text-secondary dark:text-zinc-400">
                Placed {formatWhen(detail.created_at)}
              </p>
              {detail.paystack_reference ? (
                <p className="mt-1 font-mono text-[11px] text-kofkan-text-muted dark:text-zinc-500">
                  Ref: {detail.paystack_reference}
                </p>
              ) : null}
              {(detail.payment_status ?? "pending").toLowerCase() === "pending" && (
                <button
                  type="button"
                  disabled={payBusy}
                  onClick={() => void onPayNow()}
                  className="kofkan-btn-gold kofkan-tap mt-4 w-full rounded-[10px] py-2.5 text-small font-semibold text-white disabled:opacity-60"
                >
                  {payBusy ? "Redirecting to Paystack…" : "Pay now"}
                </button>
              )}
            </section>

            <OrderStatusTimeline
              status={detail.status}
              createdAt={detail.created_at}
              updatedAt={detail.updated_at}
            />

            <section className="rounded-[12px] bg-white p-4 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
              <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
                Items
              </h2>
              <ul className="mt-3 divide-y divide-kofkan-gray-soft/80 dark:divide-white/10">
                {detail.items.map((line) => {
                  const name = line.product_name?.trim() || `Product #${line.product_id}`;
                  const lineTotal = line.price_at_purchase * line.quantity;
                  return (
                    <li key={line.id} className="flex gap-3 py-4 first:pt-0">
                      <Link
                        href={`/product/${line.product_id}`}
                        className="relative block h-[64px] w-[64px] shrink-0 overflow-hidden rounded-[10px] bg-kofkan-gray-soft dark:bg-zinc-800"
                      >
                        <OrderProductThumb
                          src={line.product_image_url}
                          className="h-full w-full object-cover"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/product/${line.product_id}`}
                          className="font-semibold leading-snug text-kofkan-text-primary hover:text-kofkan-gold dark:text-zinc-100"
                        >
                          {name}
                        </Link>
                        <p className="mt-1 text-small text-kofkan-text-secondary dark:text-zinc-400">
                          {formatGhs(line.price_at_purchase)} × {line.quantity}
                        </p>
                        <p className="mt-1 text-body font-semibold text-kofkan-gold">{formatGhs(lineTotal)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2 space-y-1.5 border-t border-kofkan-gray-soft pt-3 text-body dark:border-white/10">
                {typeof detail.subtotal_amount === "number" ? (
                  <div className="flex justify-between text-kofkan-text-secondary dark:text-zinc-400">
                    <span>Subtotal</span>
                    <span className="text-kofkan-text-primary dark:text-zinc-100">
                      {formatGhs(detail.subtotal_amount)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between text-kofkan-text-secondary dark:text-zinc-400">
                  <span>Delivery</span>
                  <span className="text-kofkan-text-primary dark:text-zinc-100">
                    {formatGhs(detail.delivery_fee ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-kofkan-gray-soft pt-2 font-bold text-kofkan-text-primary dark:border-white/10 dark:text-zinc-100">
                  <span>Total</span>
                  <span>{formatGhs(detail.total_price)}</span>
                </div>
              </div>
            </section>

            <section className="rounded-[12px] bg-white p-4 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
              <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
                Shipping
              </h2>
              <dl className="mt-3 space-y-2 text-small">
                <div>
                  <dt className="text-kofkan-text-muted dark:text-zinc-500">Method</dt>
                  <dd className="font-medium text-kofkan-text-primary dark:text-zinc-200">
                    {detail.shipping_method === "delivery"
                      ? "Delivery"
                      : detail.shipping_method === "pickup"
                        ? "Local pickup"
                        : detail.shipping_method ?? "—"}
                  </dd>
                </div>
                {regionLabel(detail.shipping_region) ? (
                  <div>
                    <dt className="text-kofkan-text-muted dark:text-zinc-500">Region</dt>
                    <dd className="font-medium text-kofkan-text-primary dark:text-zinc-200">
                      {regionLabel(detail.shipping_region)}
                    </dd>
                  </div>
                ) : null}
                {detail.shipping_city ? (
                  <div>
                    <dt className="text-kofkan-text-muted dark:text-zinc-500">City / town</dt>
                    <dd className="font-medium text-kofkan-text-primary dark:text-zinc-200">{detail.shipping_city}</dd>
                  </div>
                ) : null}
                {detail.shipping_provider ? (
                  <div>
                    <dt className="text-kofkan-text-muted dark:text-zinc-500">Courier / service</dt>
                    <dd className="font-medium text-kofkan-text-primary dark:text-zinc-200">
                      {detail.shipping_provider}
                    </dd>
                  </div>
                ) : null}
                {detail.shipping_address ? (
                  <div>
                    <dt className="text-kofkan-text-muted dark:text-zinc-500">Address</dt>
                    <dd className="whitespace-pre-wrap font-medium text-kofkan-text-primary dark:text-zinc-200">
                      {detail.shipping_address}
                    </dd>
                  </div>
                ) : null}
                {detail.shipping_contact_name ? (
                  <div>
                    <dt className="text-kofkan-text-muted dark:text-zinc-500">Delivery contact</dt>
                    <dd className="font-medium text-kofkan-text-primary dark:text-zinc-200">
                      {detail.shipping_contact_name}
                      {detail.shipping_contact_phone ? ` · ${detail.shipping_contact_phone}` : ""}
                    </dd>
                  </div>
                ) : null}
                {detail.notes ? (
                  <div>
                    <dt className="text-kofkan-text-muted dark:text-zinc-500">Notes</dt>
                    <dd className="whitespace-pre-wrap text-kofkan-text-secondary dark:text-zinc-300">{detail.notes}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            {detail.invoice ? (
              <section className="rounded-[12px] bg-white p-4 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
                <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
                  Invoice
                </h2>
                <p className="mt-2 text-small text-kofkan-text-secondary dark:text-zinc-400">
                  {detail.invoice.invoice_number}
                </p>
                <p className="mt-1 text-[11px] text-kofkan-text-muted dark:text-zinc-500">
                  Issued {formatWhen(detail.invoice.issued_at)} · {paymentLabel(detail.invoice.status)}
                </p>
                <button
                  type="button"
                  disabled={pdfBusy}
                  className="kofkan-tap mt-4 w-full rounded-[10px] border border-kofkan-gold py-3 text-small font-semibold text-kofkan-gold disabled:opacity-50"
                  onClick={() => void onDownloadPdf()}
                >
                  {pdfBusy ? "Preparing PDF…" : "Download invoice (PDF)"}
                </button>
              </section>
            ) : (
              <section className="rounded-[12px] bg-white p-4 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
                <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
                  Invoice
                </h2>
                <p className="mt-2 text-small text-kofkan-text-secondary dark:text-zinc-400">
                  Invoice record is not available for this order yet.
                </p>
              </section>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link
                href={`/orders/${orderId}/return`}
                className="block rounded-[10px] border border-kofkan-gray-soft bg-white py-3 text-center text-small font-semibold text-kofkan-text-primary dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100"
              >
                Request a return
              </Link>
              <Link
                href="/shop"
                className="block rounded-[10px] bg-kofkan-text-primary py-3 text-center text-small font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Continue shopping
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
