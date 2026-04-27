"use client";

import { FaHeartOutline, FaHeartSolid } from "@/components/FaIcons";
import { useWishlist } from "@/context/WishlistContext";

type Props = {
  productId: string;
  className?: string;
  size?: "sm" | "md";
};

export function ProductWishlistButton({ productId, className = "", size = "sm" }: Props) {
  const { isWishlisted, toggleWishlisted } = useWishlist();
  const on = isWishlisted(productId);
  const dim = size === "md" ? "h-10 w-10" : "h-9 w-9";
  const icon = size === "md" ? "!h-5 !w-5" : "!h-[1.125rem] !w-[1.125rem]";

  return (
    <button
      type="button"
      className={`kofkan-tap flex ${dim} shrink-0 items-center justify-center rounded-full bg-white/95 text-kofkan-text-primary shadow-sm ring-1 ring-black/[0.06] ${
        on ? "text-kofkan-crimson" : ""
      } ${className}`}
      aria-label={on ? "Remove from wishlist" : "Add to wishlist"}
      onClick={(e) => void toggleWishlisted(productId, e)}
    >
      {on ? <FaHeartSolid className={icon} /> : <FaHeartOutline className={icon} />}
    </button>
  );
}
