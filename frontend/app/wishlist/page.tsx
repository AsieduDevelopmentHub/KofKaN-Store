import { ScreenHeader } from "@/components/ScreenHeader";
import { WishlistScreen } from "@/components/wishlist/WishlistScreen";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Wishlist", {
  description: "Saved products — sign in to sync your wishlist across devices and shop later.",
  path: "/wishlist",
});

export default function WishlistPage() {
  return (
    <main className="bg-kofkan-cream dark:bg-zinc-950">
      <ScreenHeader
        variant="inner"
        title="Wishlist"
        left="back"
        backHref="/"
        right="cart"
      />
      <WishlistScreen />
    </main>
  );
}
