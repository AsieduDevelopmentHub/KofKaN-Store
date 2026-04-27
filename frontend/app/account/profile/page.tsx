import { AccountScreen } from "@/components/account/AccountScreen";
import { ScreenHeader } from "@/components/ScreenHeader";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Profile", {
  description: "Update your name, username, email, and contact details for KofKaN Store.",
  path: "/account/profile",
});

export default function AccountProfilePage() {
  return (
    <main className="bg-kofkan-cream dark:bg-zinc-950">
      <ScreenHeader variant="inner" title="Profile" left="back" backHref="/account" right="none" />
      <AccountScreen initialPanel="settings" />
    </main>
  );
}
