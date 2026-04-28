"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { KofKaNLogo } from "@/components/KofKaNLogo";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { useNavDrawer } from "@/context/NavDrawerContext";
import { useCart } from "@/context/CartContext";
import {
  FaAccount,
  FaBag,
  FaBars,
  FaCart,
  FaChevronLeft,
  FaHeartOutline,
  FaSearch,
} from "@/components/FaIcons";

type HomeProps = {
  variant: "home";
};

type InnerProps = {
  variant: "inner";
  title: string;
  left: "back" | "menu";
  backHref?: string;
  right: "search" | "wishlist" | "bag" | "cart" | "profile" | "none";
};

export type ScreenHeaderProps = HomeProps | InnerProps;

const hit =
  "kofkan-tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-kofkan-text-primary dark:text-zinc-100";

function CartBadge({ className = "" }: { className?: string }) {
  const { lines } = useCart();
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  if (count === 0) return null;
  return (
    <span
      className={`absolute -right-0.5 -top-0.5 flex min-h-[1.05rem] min-w-[1.05rem] items-center justify-center rounded-full bg-kofkan-crimson px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:ring-zinc-950 ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function HomeScrollHeader() {
  const { openDrawer } = useNavDrawer();
  /** Search bar hidden by default; opened via icon only */
  const [searchOpen, setSearchOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = headerRef.current;
      if (!el || el.contains(e.target as Node)) return;
      setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [searchOpen]);

  const toggleSearch = () => setSearchOpen((o) => !o);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-kofkan-gray-soft bg-white py-2 dark:border-white/10 dark:bg-zinc-950"
    >
      <div className="kofkan-storefront-max px-3">
        <div className="flex items-center gap-2">
          <button type="button" className={hit} aria-label="Open menu" onClick={openDrawer}>
            <FaBars />
          </button>
          <Link href="/" className="flex min-w-0 shrink-0 items-center px-1" aria-label="KofKaN home">
            <KofKaNLogo asset="navigation" priority />
          </Link>
          <span className="min-w-0 flex-1" aria-hidden />
          <button
            type="button"
            className={`${hit} shrink-0`}
            aria-label={searchOpen ? "Close search" : "Open search"}
            aria-expanded={searchOpen}
            aria-controls="home-search-panel"
            onClick={toggleSearch}
          >
            <FaSearch />
          </button>
          <Link href="/cart" className={`${hit} relative shrink-0`} aria-label="Shopping cart">
            <FaCart />
            <CartBadge />
          </Link>
        </div>
        {searchOpen ? (
          <div id="home-search-panel" className="mt-2 min-w-0">
            <SearchAutocomplete variant="compact" autoFocus />
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function ScreenHeader(props: ScreenHeaderProps) {
  const { openDrawer } = useNavDrawer();

  if (props.variant === "home") {
    return <HomeScrollHeader />;
  }

  const { title, left, backHref = "/", right } = props;

  return (
    <header className="sticky top-0 z-40 border-b border-kofkan-gray-soft bg-white px-3 py-2 dark:border-white/10 dark:bg-zinc-950">
      <div className="kofkan-storefront-max flex items-center justify-between gap-2">
        {left === "menu" ? (
          <button type="button" className={hit} aria-label="Open menu" onClick={openDrawer}>
            <FaBars />
          </button>
        ) : (
          <Link href={backHref} className={hit} aria-label="Back">
            <FaChevronLeft />
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate text-center font-display text-page-title font-semibold tracking-tight text-kofkan-text-primary dark:text-zinc-100">
          {title}
        </h1>
        {right === "search" && (
          <Link href="/search" className={hit} aria-label="Search">
            <FaSearch />
          </Link>
        )}
        {right === "wishlist" && (
          <Link href="/wishlist" className={hit} aria-label="Wishlist">
            <FaHeartOutline />
          </Link>
        )}
        {right === "bag" && (
          <Link href="/cart" className={`${hit} relative`} aria-label="Shopping bag">
            <FaBag />
            <CartBadge />
          </Link>
        )}
        {right === "cart" && (
          <Link href="/cart" className={`${hit} relative`} aria-label="Shopping cart">
            <FaCart />
            <CartBadge />
          </Link>
        )}
        {right === "profile" && (
          <Link href="/account" className={hit} aria-label="Account">
            <FaAccount />
          </Link>
        )}
        {right === "none" && <span className="h-11 w-11 shrink-0" aria-hidden />}
      </div>
    </header>
  );
}
