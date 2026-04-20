"use client";

import Link from "next/link";
import { Heart, LogIn, ShoppingCart } from "lucide-react";
import Image from "next/image";

import { useAppSession } from "@/components/Providers";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/categories", label: "Categories" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/contact", label: "Contact" }
];

export function SiteHeader() {
  const { user, cart } = useAppSession();
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <header className="sticky top-0 z-40 border-b border-kofkan-border bg-kofkan-white/95 backdrop-blur">
      <div className="kofkan-shell flex h-16 items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold tracking-wide">
          <span className="overflow-hidden rounded-full border border-kofkan-border bg-white p-0.5">
            <Image src="/brand/logo.jpg" alt="KofKaN logo" width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
          </span>
          <span>KofKaN Store</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium text-kofkan-charcoal md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-kofkan-black">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          {user ? (
            <Link
              href="/wishlist"
              className="hidden items-center gap-1 rounded-full border border-kofkan-border px-3 py-1.5 sm:inline-flex"
              aria-label="Wishlist"
            >
              <Heart className="h-4 w-4" />
            </Link>
          ) : null}
          <Link href="/cart" className="inline-flex items-center gap-1 rounded-full border border-kofkan-border px-3 py-1.5">
            <ShoppingCart className="h-4 w-4" />
            <span>({cartCount})</span>
          </Link>
          <Link href={user ? "/account" : "/auth/login"} className="inline-flex items-center gap-1 rounded-full bg-kofkan-black px-3 py-1.5 text-kofkan-white">
            <LogIn className="h-4 w-4" />
            {user ? user.full_name.split(" ")[0] : "Sign in"}
          </Link>
        </div>
      </div>
    </header>
  );
}
