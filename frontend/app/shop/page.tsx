import { Suspense } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ShopScreen } from "@/components/ShopScreen";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Shop all products", {
  description:
    "Browse KofKaN’s full catalog — microcontrollers, sensors, robotics motors, power, and prototyping tools with filters and secure checkout.",
  path: "/shop",
});

function ShopFallback() {
  return (
    <div className="space-y-3 bg-kofkan-cream px-4 py-4 dark:bg-zinc-950" aria-hidden>
      <div className="kofkan-skeleton h-12 w-full rounded-[10px]" />
      <div className="kofkan-skeleton h-10 w-[72%] rounded-full" />
      <div className="kofkan-skeleton h-40 w-full rounded-[10px]" />
      <div className="kofkan-skeleton h-40 w-full rounded-[10px]" />
    </div>
  );
}

export default function ShopPage() {
  return (
    <main className="bg-kofkan-cream dark:bg-zinc-950">
      <ScreenHeader
        variant="inner"
        title="Shop Products"
        left="back"
        backHref="/"
        right="wishlist"
      />
      <Suspense fallback={<ShopFallback />}>
        <ShopScreen />
      </Suspense>
    </main>
  );
}
