"use client";

import { useSearchParams } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export function ResetPasswordQueryClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim();

  if (!token) {
    return (
      <div className="mx-auto max-w-mobile px-5 py-6 text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">
        <p>This link is missing a reset token. Open the link from your email, or request a new reset from the account page.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-mobile px-5 py-6">
      <ResetPasswordForm token={token} />
    </div>
  );
}
