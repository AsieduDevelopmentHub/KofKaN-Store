"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useDialog } from "@/context/DialogContext";
import { formatGhs } from "@/lib/mock-data";
// import { variantDisplayCompact } from "@/lib/variant-display";

/**
 * `/cart` is now a pure "bag editor": view lines, change quantities, remove.
 * The full shipping/payment flow moved to `/checkout` so shoppers can review
 * the bag separately from entering address + paying.
 */
export function CartPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { confirm: confirmDialog } = useDialog();
  const {
    lines,
    setQuantity,
    removeLine,
    subtotal,
    cartSyncing,
    cartActionError,
    clearCartActionError,
  } = useCart();

  async function confirmRemoveLine(label: string, lineKey: string) {
    const ok = await confirmDialog({
      title: "Remove from cart?",
      message: `Remove “${label}” from your bag?`,
      confirmLabel: "Remove",
      cancelLabel: "Keep",
      variant: "danger",
    });
    if (ok) removeLine(lineKey);
  }

  async function adjustQuantity(lineKey: string, name: string, nextQty: number) {
    if (nextQty < 1) {
      await confirmRemoveLine(name, lineKey);
      return;
    }
    setQuantity(lineKey, nextQty);
  }

  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <main className="bg-kofkan-cream dark:bg-zinc-950">
      <ScreenHeader variant="inner" title="Cart" left="back" backHref="/" right="profile" />

      {lines.length === 0 ? (
        <div className="kofkan-storefront-max px-4 py-14 text-center text-body text-kofkan-text-secondary dark:text-zinc-400">
          <p className="font-semibold text-kofkan-text-primary dark:text-zinc-100">Your cart is empty.</p>
          <p className="mx-auto mt-2 max-w-[280px] text-small leading-relaxed">
            Sign in when you add items so your cart is saved on this device.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/shop"
              className="rounded-[10px] bg-kofkan-gold px-4 py-2.5 text-small font-semibold text-white"
            >
              Shop products
            </Link>
            {!user && (
              <Link
                href="/account"
                className="rounded-[10px] border border-kofkan-gray-soft bg-white px-4 py-2.5 text-small font-semibold text-kofkan-text-primary dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="kofkan-storefront-max px-2 sm:px-4">
          <p className="px-5 pt-4 text-small font-medium text-kofkan-text-secondary dark:text-zinc-400">
            {itemCount} {itemCount === 1 ? "item" : "items"}
            {cartSyncing && <span className="ml-2 text-kofkan-text-muted dark:text-zinc-500">· Syncing cart…</span>}
          </p>

          {cartActionError && (
            <button
              type="button"
              className="mx-4 mt-2 w-[calc(100%-2rem)] rounded-[10px] bg-white px-3 py-2 text-left text-small text-kofkan-text-primary ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/10"
              onClick={clearCartActionError}
            >
              {cartActionError}
            </button>
          )}

          <ul className="divide-y divide-kofkan-gray-soft/80 px-3 dark:divide-white/10">
            {lines.map((line) => {
              const thumb = line.variantImage || line.product.image;
              const title = line.variantLabel
                ? `${line.product.name} — ${line.variantLabel}`
                : line.product.name;
              return (
                <li key={line.lineKey} className="flex gap-4 px-2 py-5">
                  <Link
                    href={`/product/${line.product.id}`}
                    className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[10px] bg-white ring-1 ring-black/[0.05] dark:bg-zinc-900 dark:ring-white/10"
                  >
                    <Image src={thumb} alt="" fill className="object-cover" sizes="72px" unoptimized />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      href={`/product/${line.product.id}`}
                      className="font-semibold leading-snug text-kofkan-text-primary hover:text-kofkan-gold dark:text-zinc-100"
                    >
                      {title}
                    </Link>
                    <p className="text-body font-semibold text-kofkan-gold">{formatGhs(line.unitPrice)}</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-4 rounded-[10px] bg-kofkan-gray-soft px-2 py-1.5 dark:bg-zinc-800">
                        <button
                          type="button"
                          className="kofkan-tap flex h-8 w-8 items-center justify-center rounded-lg text-lg font-medium text-kofkan-text-primary dark:text-zinc-100"
                          aria-label="Decrease quantity"
                          onClick={() => void adjustQuantity(line.lineKey, title, line.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="min-w-[1.25rem] text-center text-small font-bold text-kofkan-text-primary dark:text-zinc-100">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          className="kofkan-tap flex h-8 w-8 items-center justify-center rounded-lg text-lg font-medium text-kofkan-text-primary dark:text-zinc-100"
                          aria-label="Increase quantity"
                          onClick={() => setQuantity(line.lineKey, line.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => void confirmRemoveLine(title, line.lineKey)}
                        className="text-small font-semibold text-kofkan-crimson hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mx-4 mt-2 space-y-2.5 rounded-[10px] bg-white p-4 text-body shadow-sm ring-1 ring-black/[0.05] dark:bg-zinc-900 dark:ring-white/10">
            <div className="flex justify-between text-kofkan-text-secondary dark:text-zinc-400">
              <span>Subtotal</span>
              <span className="text-kofkan-text-primary dark:text-zinc-100">{formatGhs(subtotal)}</span>
            </div>
            <p className="text-[11px] leading-snug text-kofkan-text-muted dark:text-zinc-500">
              Delivery and total calculated at checkout.
            </p>
          </div>

          <div className="px-4 py-6">
            <button
              type="button"
              disabled={cartSyncing || !user}
              className="kofkan-btn-gold kofkan-tap w-full rounded-[10px] py-3.5 text-body font-semibold text-white disabled:opacity-50"
              onClick={() => router.push("/checkout")}
            >
              Proceed to checkout
            </button>
            {!user && (
              <p className="mt-2 text-center text-small text-kofkan-text-muted dark:text-zinc-500">
                <Link href="/account" className="font-semibold text-kofkan-gold">
                  Sign in
                </Link>{" "}
                to continue order.
              </p>
            )}
            <Link
              href="/shop"
              className="mt-3 block rounded-[10px] border border-kofkan-gray-soft bg-white py-3 text-center text-small font-semibold text-kofkan-text-primary dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
