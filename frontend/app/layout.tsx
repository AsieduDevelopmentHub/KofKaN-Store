import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import { cookieBannerNeeded } from "@/lib/cookie-consent-server";
import { buildRootMetadata } from "@/lib/seo";
import PWARegister from "@/components/PWARegister";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

/** Editorial display serif — pairs cleanly with the modern electronics palette. */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0B0E14",
};

export const metadata: Metadata = buildRootMetadata();

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const showCookieConsent = await cookieBannerNeeded();
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        <PWARegister />
        <PWAInstallPrompt />
        <Providers showCookieConsent={showCookieConsent}>{children}</Providers>
      </body>
    </html>
  );
}
