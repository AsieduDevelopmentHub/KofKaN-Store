import type { Metadata } from "next";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ProductDetailContainer } from "@/components/ProductDetailContainer";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { publicSiteBaseUrl } from "@/lib/site";
import { productMetadata } from "@/lib/seo";
import {
  fetchProductById,
  resolveImageUrl,
} from "@/lib/api/products";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const product = await fetchProductById(Number(id));

    const imageUrl = resolveImageUrl(
      product.image_url
    ).replace(/\?$/, "");

    return productMetadata({
      title: product.name,
      description:
        product.description ||
        `Buy ${product.name} from KofKaN Store`,
      path: `/product/${id}`,
      image: imageUrl,
    });
  } catch {
    return productMetadata({
      title: "Product",
      description: "Product details from KofKaN Store",
      path: `/product/${id}`,
    });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductPage({ params }: Props) {
  const { id } = await params;

  const product = await fetchProductById(Number(id)).catch(() => null);

  const productUrl = `${publicSiteBaseUrl()}/product/${id}`;

  return (
    <main className="min-h-screen bg-kofkan-cream dark:bg-zinc-950">
      <ScreenHeader
        variant="inner"
        title="Product"
        left="back"
        backHref="/shop"
        right="wishlist"
      />

      <ProductDetailContainer id={id} />

      <WhatsAppFloat
        productName={product?.name}
        productPrice={product?.price ? `GH₵ ${product.price}` : undefined}
        productDescription={product?.description ? `${product.description}` : undefined}
        productUrl={productUrl}
      />
    </main>
  );
}