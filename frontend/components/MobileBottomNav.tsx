"use client";

import Link from "next/link";
import { House, Package, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { usePathname } from "next/navigation";

import { useAppSession } from "@/components/Providers";

const items = [
  { href: "/", label: "Home", Icon: House },
  { href: "/shop", label: "Shop", Icon: ShoppingBag },
  { href: "/cart", label: "Cart", Icon: ShoppingCart },
  { href: "/orders", label: "Orders", Icon: Package },
  { href: "/account", label: "Account", Icon: User }
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { cart } = useAppSession();
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartLabel = cartCount > 99 ? "99+" : String(cartCount);
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-kofkan-border bg-kofkan-white pb-1 pt-1 md:hidden">
      <ul className="relative grid grid-cols-5 items-end">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.Icon;
          if (item.href === "/cart") {
            return (
              <li key={item.href} className="relative flex justify-center">
                <span
                  className="pointer-events-none absolute -top-3 h-7 w-16 rounded-[999px] border border-kofkan-border bg-kofkan-white"
                  aria-hidden
                />
                <Link href={item.href} className="relative z-[1] -mt-3 flex flex-col items-center gap-1">
                  <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-zinc-200 to-zinc-400 text-kofkan-black shadow-[0_8px_20px_rgba(0,0,0,0.25)] ring-2 ring-white">
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-kofkan-black px-1 text-[9px] font-bold text-white">
                        {cartLabel}
                      </span>
                    ) : null}
                  </span>
                  <span className={`text-[10px] font-semibold ${active ? "text-kofkan-black" : "text-kofkan-muted"}`}>Cart</span>
                </Link>
              </li>
            );
          }
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 px-2 py-2 text-center text-xs font-medium ${active ? "text-kofkan-black" : "text-kofkan-muted"}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
