import { ScreenHeader } from "@/components/ScreenHeader";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

type Props = { params: Promise<{ token: string }> };

export default async function ResetPasswordTokenPage({ params }: Props) {
  const { token } = await params;
  const decoded = decodeURIComponent(token);

  return (
    <main className="min-h-screen bg-kofkan-cream dark:bg-zinc-950">
      <ScreenHeader
        variant="inner"
        title="Reset password"
        left="back"
        backHref="/account"
        right="none"
      />
      <div className="mx-auto max-w-mobile px-5 py-6">
        <ResetPasswordForm token={decoded} />
      </div>
    </main>
  );
}
