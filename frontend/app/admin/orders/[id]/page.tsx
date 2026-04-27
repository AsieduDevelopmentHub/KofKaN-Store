"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDialog } from "@/context/DialogContext";
import {
  adminDownloadInvoicePdf,
  adminFetchOrderDetail,
  adminFetchUsers,
  adminUpdateOrderStatus,
  adminUpdateOrderTracking,
  type AdminOrderDetail,
} from "@/lib/api/admin";
import { getBackendOrigin } from "@/lib/api/client";
import { formatGhs } from "@/lib/mock-data";
import { AdminOrderDetailSkeleton } from "@/components/admin/Skeleton";

/** Quick status changes (shipped / cancelled use dedicated forms below). */
const QUICK_STATUSES = ["pending", "processing", "delivered"] as const;

export default function AdminOrderDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { accessToken } = useAuth();
  const { alert: alertDialog } = useDialog();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [eta, setEta] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [customerLabel, setCustomerLabel] = useState<string>("");

  const load = useCallback(async () => {
    if (!accessToken || !Number.isFinite(id)) return;
    setErr(null);
    try {
      const [o, users] = await Promise.all([
        adminFetchOrderDetail(accessToken, id),
        adminFetchUsers(accessToken, { limit: 100 }),
      ]);
      setOrder(o);
      const u = users.find((x) => x.id === o.user_id);
      setCustomerLabel(u ? `${u.name || u.username} (@${u.username})` : `User ${o.user_id}`);
      setTracking(o.tracking_number ?? "");
      setCarrier(o.shipping_provider ?? "");
      setEta(o.estimated_delivery ? o.estimated_delivery.slice(0, 10) : "");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
      setOrder(null);
    }
  }, [accessToken, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const origin = typeof window !== "undefined" ? getBackendOrigin() : "";

  const setStatusSimple = async (status: string) => {
    if (!accessToken) return;
    setBusy(true);
    try {
      await adminUpdateOrderStatus(accessToken, id, status);
      await load();
    } catch (e) {
      void alertDialog(e instanceof Error ? e.message : "Update failed", { variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  const saveShipped = async () => {
    if (!accessToken) return;
    setBusy(true);
    try {
      await adminUpdateOrderTracking(accessToken, id, {
        status: "shipped",
        tracking_number: tracking.trim() || undefined,
        shipping_provider: carrier.trim() || undefined,
        estimated_delivery: eta ? new Date(eta).toISOString() : undefined,
      });
      await load();
    } catch (e) {
      void alertDialog(e instanceof Error ? e.message : "Update failed", { variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  const saveCancelled = async () => {
    if (!accessToken) return;
    setBusy(true);
    try {
      await adminUpdateOrderTracking(accessToken, id, {
        status: "cancelled",
        cancel_reason: cancelReason.trim() || "Cancelled by admin",
      });
      await load();
    } catch (e) {
      void alertDialog(e instanceof Error ? e.message : "Update failed", { variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  const pdf = async () => {
    if (!accessToken) return;
    try {
      const blob = await adminDownloadInvoicePdf(accessToken, id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      void alertDialog(e instanceof Error ? e.message : "PDF failed", { variant: "error" });
    }
  };

  if (!order && !err) {
    return (
      <div className="w-full min-w-0 max-w-full">
        <Link href="/system/orders" className="text-small font-semibold text-kofkan-gold hover:underline">
          ← Orders
        </Link>
        <h1 className="mt-3 font-serif text-page-title font-semibold">Order</h1>
        <AdminOrderDetailSkeleton />
      </div>
    );
  }

  if (err || !order) {
    return (
      <div>
        <Link href="/system/orders" className="text-small font-semibold text-kofkan-gold hover:underline">
          ← Orders
        </Link>
        <p className="mt-4 text-small text-red-800">{err}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full">
      <Link href="/system/orders" className="text-small font-semibold text-kofkan-gold hover:underline">
        ← Orders
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-page-title font-semibold">Order #{order.id}</h1>
          <p className="text-small text-kofkan-text-muted">
            {customerLabel || `User ${order.user_id}`} · Ordered {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void pdf()}
            className="rounded-full bg-white px-4 py-2 text-small font-semibold ring-1 ring-black/[0.1]"
          >
            Invoice PDF
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
          <h2 className="font-serif text-section-title font-semibold">Status</h2>
          <p className="mt-2 text-small capitalize text-kofkan-text-secondary">
            Fulfillment: <strong className="text-kofkan-text-primary">{order.status}</strong>
          </p>
          <p className="text-small text-kofkan-text-secondary">
            Payment: <strong>{order.payment_status}</strong>
            {order.paystack_reference ? ` · ${order.paystack_reference}` : ""}
          </p>
          <p className="text-small text-kofkan-text-secondary">
            Order date: <strong>{new Date(order.created_at).toLocaleString()}</strong>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy || order.status === s}
                onClick={() => void setStatusSimple(s)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize ${
                  order.status === s ? "bg-kofkan-gold/25 text-kofkan-bg-deep" : "bg-kofkan-cream ring-1 ring-black/[0.08] hover:bg-white"
                } disabled:opacity-50`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-kofkan-text-muted">
            For <strong>shipped</strong> or <strong>cancelled</strong>, use the sections below (customer emails fire from
            those actions).
          </p>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
          <h2 className="font-serif text-section-title font-semibold">Shipping</h2>
          <div className="mt-3 space-y-2 text-small text-kofkan-text-secondary">
            {order.shipping_address && <p className="whitespace-pre-wrap">{order.shipping_address}</p>}
            {order.shipping_contact_name && <p>Contact: {order.shipping_contact_name}</p>}
            {order.shipping_contact_phone && <p>Phone: {order.shipping_contact_phone}</p>}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
        <h2 className="font-serif text-section-title font-semibold">Mark shipped</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block text-small font-medium text-kofkan-text-secondary">
            Tracking #
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/[0.08] px-3 py-2 text-body"
            />
          </label>
          <label className="block text-small font-medium text-kofkan-text-secondary">
            Carrier
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/[0.08] px-3 py-2 text-body"
            />
          </label>
          <label className="block text-small font-medium text-kofkan-text-secondary">
            Est. delivery
            <input
              type="date"
              value={eta}
              onChange={(e) => setEta(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/[0.08] px-3 py-2 text-body"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveShipped()}
          className="mt-4 rounded-full bg-kofkan-crimson px-5 py-2 text-small font-semibold text-white disabled:opacity-60"
        >
          Save as shipped & notify customer
        </button>
      </section>

      <section className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
        <h2 className="font-serif text-section-title font-semibold">Cancel order</h2>
        <label className="mt-3 block text-small font-medium text-kofkan-text-secondary">
          Reason (shown to customer email)
          <input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/[0.08] px-3 py-2 text-body"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveCancelled()}
          className="mt-4 rounded-full bg-neutral-800 px-5 py-2 text-small font-semibold text-white disabled:opacity-60"
        >
          Cancel order
        </button>
      </section>

      <section className="mt-6 w-full min-w-0 overflow-x-auto rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06] sm:p-5">
        <h2 className="font-serif text-section-title font-semibold">Line items</h2>
        <ul className="mt-3 min-w-0 divide-y divide-kofkan-gray-soft">
          {order.items.map((line) => {
            const img = line.product_image_url
              ? line.product_image_url.startsWith("http")
                ? line.product_image_url
                : `${origin}${line.product_image_url}`
              : null;
            return (
              <li key={line.id} className="flex min-w-0 gap-3 py-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-kofkan-gray-soft">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{line.product_name ?? `Product ${line.product_id}`}</p>
                  {line.variant_detail_snapshot?.trim() ? (
                    <p className="mt-1 whitespace-pre-wrap text-[11px] leading-snug text-kofkan-text-muted">
                      {line.variant_detail_snapshot.trim()}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-kofkan-text-muted">
                    Qty {line.quantity} × {formatGhs(line.price_at_purchase)}
                  </p>
                </div>
                <p className="font-semibold">{formatGhs(line.quantity * line.price_at_purchase)}</p>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 border-t border-black/[0.06] pt-4 text-right">
          <p className="text-section-title font-semibold">{formatGhs(order.total_price)}</p>
          {order.invoice && (
            <p className="text-[11px] text-kofkan-text-muted">
              Invoice {order.invoice.invoice_number} · {order.invoice.status} · issued{" "}
              {new Date(order.invoice.issued_at).toLocaleString()}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
