import { AccountScreen } from "@/components/account/AccountScreen";
import { ScreenHeader } from "@/components/ScreenHeader";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Addresses", {
  description: "Manage shipping addresses and delivery details for KofKaN Store orders.",
  path: "/account/addresses",
});

export default function AccountAddressesPage() {
  return (
    <main className="bg-kofkan-cream dark:bg-zinc-950">
      <ScreenHeader variant="inner" title="Addresses" left="back" backHref="/account" right="none" />
      <AccountScreen initialPanel="address" />
    </main>
  );
}
