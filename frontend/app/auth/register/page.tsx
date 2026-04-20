"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAppSession } from "@/components/Providers";

export default function RegisterPage() {
  const router = useRouter();
  const { registerUser } = useAppSession();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await registerUser({ email, password, full_name: fullName });
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <main className="kofkan-shell py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-kofkan-border p-6">
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="mt-1 text-sm text-kofkan-muted">Start shopping with saved cart and order history.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="w-full rounded-lg border border-kofkan-border px-3 py-2" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border border-kofkan-border px-3 py-2" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-lg border border-kofkan-border px-3 py-2" />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" className="w-full rounded-lg bg-kofkan-black py-2 font-semibold text-kofkan-white">
            Register
          </button>
        </form>
        <p className="mt-4 text-sm text-kofkan-muted">
          Already have account?{" "}
          <Link href="/auth/login" className="font-semibold text-kofkan-black">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
