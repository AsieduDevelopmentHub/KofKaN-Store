import { Suspense } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ResetPasswordQueryClient } from "@/components/auth/ResetPasswordQueryClient";

function QueryFallback() {
  return (
    <div className="mx-auto max-w-mobile px-5 py-6 text-small text-kofkan-text-secondary dark:text-zinc-400">
      Loading…
    </div>
  );
}

export default function ResetPasswordLegacyPage() {
  return (
    <main className="min-h-screen bg-kofkan-cream dark:bg-zinc-950">
      <ScreenHeader
        variant="inner"
        title="Reset password"
        left="back"
        backHref="/account"
        right="none"
      />
      <Suspense fallback={<QueryFallback />}>
        <ResetPasswordQueryClient />
      </Suspense>
    </main>
  );
}
