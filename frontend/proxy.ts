import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Admin URL cloning.
 *
 * Public URL space: `/system/*`
 * App files live under: `/admin/*`
 *
 * Next.js 16 renamed `middleware.ts` -> `proxy.ts`.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const host = (req.headers.get("host") || "").split(":")[0]?.toLowerCase();
  const adminHost = (process.env.ADMIN_HOST || process.env.NEXT_PUBLIC_ADMIN_HOST || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const isAdminHost = host ? adminHost.includes(host) : false;

  // Admin subdomain: map root paths to admin app.
  // - `/` -> `/admin`
  // - `/orders` -> `/admin/orders`
  // Still allow `/system/*` on admin host if you want to keep the same UI links everywhere.
  if (isAdminHost && (pathname === "/" || (!pathname.startsWith("/admin") && !pathname.startsWith("/system")))) {
    const nextUrl = req.nextUrl.clone();
    nextUrl.pathname = `/admin${pathname === "/" ? "" : pathname}`;
    nextUrl.search = search;
    return NextResponse.rewrite(nextUrl);
  }

  // Rewrite /system/* -> /admin/*
  if (pathname === "/system" || pathname.startsWith("/system/")) {
    const nextUrl = req.nextUrl.clone();
    nextUrl.pathname = pathname.replace(/^\/system\b/, "/admin");
    nextUrl.search = search;
    return NextResponse.rewrite(nextUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/system", "/system/:path*"],
};

