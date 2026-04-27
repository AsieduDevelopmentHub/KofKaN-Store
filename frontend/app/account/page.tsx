import { AccountScreen } from "@/components/account/AccountScreen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Account", {
  description: "Sign in, manage your profile, addresses, orders, wishlist, and security settings on KofKaN Store.",
  path: "/account",
});

export default function AccountPage() {
  return (
    <main className="bg-kofkan-cream dark:bg-zinc-950">
      <ScreenHeader
        variant="inner"
        title="Account"
        left="back"
        backHref="/"
        right="none"
      />
      <AccountScreen />
    </main>
  );
}
