"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaAccount, FaCart, FaHome, FaOrders, FaShop } from "@/components/FaIcons";
import { useCart } from "@/context/CartContext";

const tabs = [
  { href: "/", label: "Home", Icon: FaHome, match: (p: string) => p === "/" },
  {
    href: "/shop",
    label: "Shop",
    Icon: FaShop,
    match: (p: string) => p.startsWith("/shop") || p.startsWith("/product"),
  },
  {
    href: "/cart",
    label: "Cart",
    Icon: FaCart,
    match: (p: string) => p.startsWith("/cart"),
  },
  {
    href: "/orders",
    label: "Orders",
    Icon: FaOrders,
    match: (p: string) => p.startsWith("/orders"),
  },
  {
    href: "/account",
    label: "Account",
    Icon: FaAccount,
    match: (p: string) => p.startsWith("/account"),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname() || "/";
  const { lines } = useCart();
  const cartCount = lines.reduce((s, l) => s + l.quantity, 0);
  const cartLabel = cartCount > 99 ? "99+" : String(cartCount);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center border-t border-kofkan-gray-soft bg-white pb-[calc(0.35rem+var(--safe-bottom))] pt-1 shadow-[0_-6px_24px_rgba(11,14,20,0.08)] dark:border-white/10 dark:bg-zinc-900"
      aria-label="Primary"
    >
      <div className="kofkan-storefront-max relative flex items-end justify-between px-1">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.Icon;

          if (tab.href === "/cart") {
            return (
              <div key={tab.href} className="relative flex min-w-[56px] flex-1 flex-col items-center">
                <div
                  className="pointer-events-none absolute left-1/2 top-0 h-7 w-[4.25rem] -translate-x-1/2 -translate-y-[55%] rounded-[50%] border border-kofkan-gray-soft/80 bg-white dark:border-white/10 dark:bg-zinc-900"
                  aria-hidden
                />
                <Link
                  href={tab.href}
                  className="kofkan-tap relative z-[1] -mt-3 flex flex-col items-center gap-0.5"
                >
                  <span className="relative flex h-[2.85rem] w-[2.85rem] items-center justify-center rounded-full bg-gradient-to-b from-kofkan-cyan to-kofkan-cyan-dark text-white shadow-[0_6px_18px_rgba(0,184,217,0.5)] ring-[3px] ring-white dark:from-cyan-400 dark:to-cyan-600 dark:ring-zinc-900">
                    <Icon className="!h-6 !w-6" />
                    {cartCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-kofkan-accent px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:ring-zinc-900">
                        {cartLabel}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`text-[10px] font-semibold leading-none tracking-wide ${
                      active ? "text-kofkan-cyan" : "text-kofkan-text-muted"
                    }`}
                  >
                    {tab.label}
                  </span>
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`kofkan-tap flex min-w-[52px] flex-1 flex-col items-center gap-1 rounded-xl px-1 py-0.5 ${
                active ? "text-kofkan-cyan" : "text-kofkan-text-muted"
              }`}
            >
              <Icon className={active ? "text-kofkan-cyan" : "text-kofkan-text-muted"} />
              <span className="text-[10px] font-medium leading-none tracking-wide">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
