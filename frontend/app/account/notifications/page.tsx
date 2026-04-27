import { AccountScreen } from "@/components/account/AccountScreen";
import { ScreenHeader } from "@/components/ScreenHeader";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Notifications", {
  description: "Notification preferences and updates from KofKaN Store.",
  path: "/account/notifications",
});

export default function AccountNotificationsPage() {
  return (
    <main className="bg-kofkan-cream dark:bg-zinc-950">
      <ScreenHeader variant="inner" title="Notifications" left="back" backHref="/account" right="none" />
      <AccountScreen initialPanel="notifications" />
    </main>
  );
}
