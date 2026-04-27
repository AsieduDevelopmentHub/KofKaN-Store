import Link from "next/link";
import { ScreenHeader } from "@/components/ScreenHeader";
import { pageMetadata } from "@/lib/seo";
import { whatsappHelpUrl } from "@/lib/site";

export const metadata = pageMetadata("FAQs", {
  description:
    "Frequently asked questions about orders, delivery, account security, returns, and support for KofKaN Store.",
  path: "/faq",
});

export default function FaqPage() {
  const wa = whatsappHelpUrl();

  return (
    <main className="min-h-screen bg-kofkan-cream dark:bg-zinc-950">
      <ScreenHeader variant="inner" title="FAQs" left="back" backHref="/" right="none" />
      <article className="mx-auto max-w-mobile space-y-6 px-5 py-8 text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">
        <section>
          <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
            Ordering & delivery
          </h2>
          <p className="mt-2">
            Add items to your cart, check out when signed in, and track orders from the Orders tab. Delivery options are
            confirmed at checkout.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
            Account & password
          </h2>
          <p className="mt-2">
            Sign in with your username or email. If you forget your password, use Account → Forgot password to receive a
            reset link.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
            Need more help?
          </h2>
          <p className="mt-2">
            {wa ? (
              <>
                Message us on WhatsApp:{" "}
                <a href={wa} className="font-semibold text-kofkan-gold underline-offset-2 hover:underline">
                  open chat
                </a>
                .
              </>
            ) : (
              "Configure NEXT_PUBLIC_WHATSAPP_HELP_URL to show a direct WhatsApp link here."
            )}
          </p>
        </section>
        <p>
          <Link href="/" className="font-semibold text-kofkan-gold underline-offset-2 hover:underline">
            Back to home
          </Link>
        </p>
      </article>
    </main>
  );
}
