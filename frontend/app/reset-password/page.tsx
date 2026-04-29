import { Suspense } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SkeletonBlock } from "@/components/StorefrontSkeletons";
import { ResetPasswordQueryClient } from "@/components/auth/ResetPasswordQueryClient";

function QueryFallback() {
  return (
    <div className="mx-auto max-w-mobile space-y-3 px-5 py-6" aria-hidden>
      <SkeletonBlock className="h-5 w-40 rounded" />
      <SkeletonBlock className="h-10 w-full rounded-[10px]" />
      <SkeletonBlock className="h-10 w-full rounded-[10px]" />
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
