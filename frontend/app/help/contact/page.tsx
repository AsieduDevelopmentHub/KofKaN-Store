import { HelpArticle } from "@/components/help/HelpArticle";
import { StoreLocationMap } from "@/components/help/StoreLocationMap";
import { getWhatsAppChatUrl } from "@/lib/contact";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Contact support", {
  description: "Reach KofKaN Store customer support — WhatsApp, email paths, and response expectations.",
  path: "/help/contact",
});

const SUPPORT_EMAIL = "support@kofkan.com";

export default function HelpContactPage() {
  return (
    <HelpArticle title="Contact support" eyebrow="Help · Contact">
      <h2>Reach us</h2>
      <ul className="space-y-2">
        <li>
          <strong>WhatsApp:</strong>{" "}
          <a
            className="font-semibold text-kofkan-gold hover:underline"
            href={getWhatsAppChatUrl()}
            target="_blank"
            rel="noreferrer noopener"
          >
            Start a chat
          </a>
        </li>
        <li>
          <strong>Email:</strong>{" "}
          <a className="font-semibold text-kofkan-gold hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </li>
      </ul>
      <h2>Hours</h2>
      <p>Monday–Friday, 8am – 6pm GMT. <br />
        Sunday, 11am – 5pm GMT. <br />
        We respond within 24 hours on business days.</p>
      <h2 id="store-map" className="scroll-mt-24">
        Store location
      </h2>
      <StoreLocationMap />
      <h2>Before you write in</h2>
      <p>
        Please include your order reference (e.g. <span className="font-mono">#1234</span>) so we can pull it up
        immediately. Screenshots help a lot — attach them if something looks off.
      </p>
    </HelpArticle>
  );
}
