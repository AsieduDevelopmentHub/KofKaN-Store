import type { MetadataRoute } from "next";
import { publicSiteBaseUrl } from "@/lib/site";

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/shop", changeFrequency: "daily", priority: 0.9 },
  { path: "/search", changeFrequency: "weekly", priority: 0.6 },
  { path: "/help", changeFrequency: "monthly", priority: 0.5 },
  { path: "/help/shipping", changeFrequency: "monthly", priority: 0.4 },
  { path: "/help/returns", changeFrequency: "monthly", priority: 0.4 },
  { path: "/help/payment", changeFrequency: "monthly", priority: 0.4 },
  { path: "/help/orders", changeFrequency: "monthly", priority: 0.4 },
  { path: "/help/account", changeFrequency: "monthly", priority: 0.4 },
  { path: "/help/contact", changeFrequency: "monthly", priority: 0.4 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicSiteBaseUrl();
  const now = new Date();
  return STATIC_ROUTES.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
