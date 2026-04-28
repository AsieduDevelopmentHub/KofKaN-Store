import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Orbitron, Inter, Roboto_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { cookieBannerNeeded } from "@/lib/cookie-consent-server";
import { buildRootMetadata } from "@/lib/seo";
import PWARegister from "@/components/PWARegister";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

/** Futuristic display font for electronics branding */
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0B0E14",
};

export const metadata: Metadata = buildRootMetadata();

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const showCookieConsent = await cookieBannerNeeded();
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${orbitron.variable} ${inter.variable} ${robotoMono.variable}`}>
      <body>
        <PWARegister />
        <PWAInstallPrompt />
        <Providers showCookieConsent={showCookieConsent}>{children}</Providers>
      </body>
    </html>
  );
}
