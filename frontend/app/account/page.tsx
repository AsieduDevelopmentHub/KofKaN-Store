"use client";

import Link from "next/link";

import { useAppSession } from "@/components/Providers";

export default function AccountPage() {
  const { user, logout } = useAppSession();

  if (!user) {
    return (
      <main className="kofkan-shell py-10">
        <h1 className="text-3xl font-bold">Account</h1>
        <p className="mt-2 text-kofkan-muted">Please sign in to see your account details.</p>
        <Link href="/auth/login" className="mt-4 inline-block rounded-lg bg-kofkan-black px-4 py-2 text-kofkan-white">
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="kofkan-shell py-10">
      <h1 className="text-3xl font-bold">Welcome, {user.full_name}</h1>
      <p className="mt-1 text-kofkan-muted">{user.email}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/orders" className="rounded-xl border border-kofkan-border p-5">
          <h2 className="font-semibold">My Orders</h2>
          <p className="mt-1 text-sm text-kofkan-muted">Track all purchases and statuses.</p>
        </Link>
        <Link href="/cart" className="rounded-xl border border-kofkan-border p-5">
          <h2 className="font-semibold">My Cart</h2>
          <p className="mt-1 text-sm text-kofkan-muted">Manage pending items before checkout.</p>
        </Link>
      </div>
      {user.is_admin ? (
        <Link href="/admin" className="mt-6 inline-block rounded-lg bg-kofkan-black px-4 py-2 text-kofkan-white">
          Open Admin
        </Link>
      ) : null}
      <button type="button" onClick={logout} className="mt-6 block rounded-lg border border-kofkan-border px-4 py-2">
        Logout
      </button>
    </main>
  );
}
