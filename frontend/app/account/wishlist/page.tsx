import { redirect } from "next/navigation";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Saved items", {
  description: "Your wishlist and saved products on KofKaN Store.",
  path: "/account/wishlist",
});

export default function AccountWishlistPage() {
  redirect("/shop");
}
