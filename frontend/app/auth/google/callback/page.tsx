"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAppSession } from "@/components/Providers";
import { completeGoogleLogin } from "@/lib/api/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const { applyAuth } = useAppSession();
  const [message, setMessage] = useState("Completing Google sign-in...");

  useEffect(() => {
    const run = async () => {
      try {
        const code = new URLSearchParams(window.location.search).get("code");
        const client = getSupabaseBrowserClient();

        if (code) {
          const exchange = await client.auth.exchangeCodeForSession(code);
          if (exchange.error) {
            throw exchange.error;
          }
        }

        const { data, error } = await client.auth.getUser();
        if (error || !data.user) {
          throw new Error("Unable to read Google user profile");
        }

        const email = data.user.email;
        const sub = data.user.id;
        const name =
          (data.user.user_metadata?.full_name as string | undefined) ??
          (data.user.user_metadata?.name as string | undefined) ??
          "Google User";

        if (!email) {
          throw new Error("Google account email is missing");
        }

        const auth = await completeGoogleLogin({ email, name, sub });
        applyAuth(auth);
        router.replace("/account");
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Google login failed");
      }
    };

    void run();
  }, [applyAuth, router]);

  return (
    <main className="kofkan-shell py-14">
      <div className="mx-auto max-w-lg rounded-2xl border border-kofkan-border bg-white p-6 text-center">
        <h1 className="text-2xl font-bold">Google Sign-In</h1>
        <p className="mt-3 text-sm text-kofkan-muted">{message}</p>
      </div>
    </main>
  );
}
