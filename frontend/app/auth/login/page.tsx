"use client";

import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAppSession } from "@/components/Providers";
import { GoogleMark } from "@/components/icons/GoogleMark";
import { signInWithGoogle } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const { loginUser } = useAppSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await loginUser({ email, password });
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <main className="kofkan-shell py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-kofkan-border bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-kofkan-muted">Access account, cart, and orders.</p>
        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-kofkan-border bg-kofkan-bg-secondary py-2.5 font-semibold"
        >
          <GoogleMark className="h-4 w-4" />
          Continue with Google
        </button>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="relative block">
            <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-kofkan-muted" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-kofkan-border px-10 py-2.5"
            />
          </label>
          <label className="relative block">
            <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-kofkan-muted" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-kofkan-border px-10 py-2.5"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" className="w-full rounded-lg bg-kofkan-black py-2.5 font-semibold text-kofkan-white">
            Sign In
          </button>
        </form>
        <p className="mt-4 text-sm text-kofkan-muted">
          New here?{" "}
          <Link href="/auth/register" className="font-semibold text-kofkan-black">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
