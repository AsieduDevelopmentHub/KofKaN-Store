import type { MetadataRoute } from "next";
import { publicSiteBaseUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = publicSiteBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/account",
          "/cart",
          "/checkout",
          "/orders",
          "/wishlist",
          "/reset-password",
        ],
      },
    ],
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}
