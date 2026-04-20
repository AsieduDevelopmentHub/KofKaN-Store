"use client";

import Link from "next/link";
import { Heart, LogOut, Package, Shield, ShoppingCart, Undo2 } from "lucide-react";

import { useAppSession } from "@/components/Providers";

const cards = [
  {
    href: "/orders",
    title: "Orders",
    desc: "Track status and complete payment.",
    Icon: Package
  },
  {
    href: "/cart",
    title: "Cart",
    desc: "Review items before checkout.",
    Icon: ShoppingCart
  },
  {
    href: "/wishlist",
    title: "Wishlist",
    desc: "Saved products for later.",
    Icon: Heart
  },
  {
    href: "/account/returns",
    title: "Returns",
    desc: "Request a return or exchange.",
    Icon: Undo2
  }
];

export default function AccountPage() {
  const { user, logout } = useAppSession();

  if (!user) {
    return (
      <main className="kofkan-shell py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-kofkan-border bg-kofkan-bg-secondary p-8 text-center">
          <h1 className="text-2xl font-bold">Account</h1>
          <p className="mt-2 text-sm text-kofkan-muted">Sign in to manage orders, wishlist, and returns.</p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block rounded-xl bg-kofkan-black px-6 py-3 text-sm font-semibold text-kofkan-white"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="kofkan-shell py-10 pb-24 md:pb-10">
      <div className="rounded-2xl border border-kofkan-border bg-gradient-to-br from-kofkan-black to-kofkan-charcoal p-6 text-kofkan-white md:p-8">
        <p className="text-xs uppercase tracking-wider text-zinc-400">Signed in</p>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">Hello, {user.full_name}</h1>
        <p className="mt-1 text-sm text-zinc-300">{user.email}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {user.is_admin ? (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl bg-kofkan-white px-4 py-2.5 text-sm font-semibold text-kofkan-black"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          ) : null}
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-500 px-4 py-2.5 text-sm font-semibold text-kofkan-white"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold">Your hub</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {cards.map(({ href, title, desc, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-kofkan-border bg-kofkan-white p-5 shadow-sm transition hover:border-kofkan-black"
          >
            <Icon className="h-5 w-5 text-kofkan-black" />
            <h3 className="mt-3 font-semibold group-hover:underline">{title}</h3>
            <p className="mt-1 text-sm text-kofkan-muted">{desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
