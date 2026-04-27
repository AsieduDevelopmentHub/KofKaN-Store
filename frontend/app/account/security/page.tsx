import { AccountScreen } from "@/components/account/AccountScreen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Security", {
  description: "Two-factor authentication, password changes, and account protection on KofKaN Store.",
  path: "/account/security",
});

export default function AccountSecurityPage() {
  return (
    <main className="bg-kofkan-cream dark:bg-zinc-950">
      <ScreenHeader variant="inner" title="Security" left="back" backHref="/account" right="none" />
      <AccountScreen initialPanel="security" />
    </main>
  );
}
