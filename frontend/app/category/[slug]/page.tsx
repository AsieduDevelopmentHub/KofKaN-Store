import type { Metadata } from "next";
import { ScreenHeader } from "@/components/ScreenHeader";
import { pageMetadata, SITE_KEYWORDS } from "@/lib/seo";
import { CategoryScreen } from "@/components/category/CategoryScreen";

type Props = { params: Promise<{ slug: string }> };

function humanize(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const label = humanize(slug);
  return pageMetadata(label, {
    description: `Shop ${label.toLowerCase()} at KofKaN — quality embedded systems, robotics, and programming components with fast delivery and secure checkout.`,
    path: `/category/${slug}`,
    keywords: [...SITE_KEYWORDS, label.toLowerCase(), slug],
  });
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  return (
    <main className="bg-kofkan-cream dark:bg-zinc-950">
      <ScreenHeader
        variant="inner"
        title={humanize(slug)}
        left="back"
        backHref="/shop"
        right="cart"
      />
      <CategoryScreen slug={slug} />
    </main>
  );
}
