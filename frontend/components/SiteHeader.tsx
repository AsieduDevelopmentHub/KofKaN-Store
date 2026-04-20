import Link from "next/link";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/categories", label: "Categories" },
  { href: "/contact", label: "Contact" }
];

export function SiteHeader() {
  return (
    <header className="border-b border-kofkan-border bg-kofkan-white">
      <div className="kofkan-shell flex h-16 items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-wide">
          KofKaN Store
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-kofkan-charcoal">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-kofkan-black">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
