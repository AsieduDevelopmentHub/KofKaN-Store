import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Admin URL cloning.
 *
 * Public URL space: `/system/*`
 * App files live under: `/admin/*`
 *
 * This lets you later host admin under a subdomain (e.g. admin.kofkan.store)
 * without duplicating route files.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

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
  matcher: ["/system/:path*"],
};

