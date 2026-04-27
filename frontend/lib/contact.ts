const WA_E164 = process.env.NEXT_PUBLIC_WHATSAPP_E164?.trim() || "233531558216";

export function getWhatsAppChatUrl(message?: string): string {
  const base = `https://wa.me/${WA_E164.replace(/^\+/, "")}`;
  if (message) {
    const encoded = encodeURIComponent(message);
    return `${base}?text=${encoded}`;
  }
  return base;
}
