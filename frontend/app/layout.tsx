import type { Metadata } from "next";

import "@/app/globals.css";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Providers } from "@/components/Providers";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "KofKaN Store | Electronics Commerce",
  description: "Premium electronics components storefront powered by FastAPI and Next.js."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SiteHeader />
          {children}
          <SiteFooter />
          <MobileBottomNav />
        </Providers>
      </body>
    </html>
  );
}
