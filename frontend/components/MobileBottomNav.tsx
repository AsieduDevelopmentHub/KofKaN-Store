"use client";

import Link from "next/link";
import { House, Package, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", Icon: House },
  { href: "/shop", label: "Shop", Icon: ShoppingBag },
  { href: "/cart", label: "Cart", Icon: ShoppingCart },
  { href: "/orders", label: "Orders", Icon: Package },
  { href: "/account", label: "Account", Icon: User }
];

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-kofkan-border bg-kofkan-white md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.Icon;
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
