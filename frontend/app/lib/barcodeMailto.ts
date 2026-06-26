const PRODUCTION_API_BASE_URL = "https://mealquota-production.up.railway.app/api/v1";

export const DRAFT_EMAIL_LINK_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500";

export type BarcodeMailtoRecipient = {
  email: string;
  name: string;
  position: string;
  uid: string;
};

export function getBarcodeImageUrl(uid: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") || PRODUCTION_API_BASE_URL;

  return `${baseUrl}/barcodes/${uid}.png`;
}

export function buildBarcodeMailtoHref({ email, name, position, uid }: BarcodeMailtoRecipient): string {
  const barcodeUrl = getBarcodeImageUrl(uid);
  const subject = `Action Required: Your Meal Quota Barcode — ${name}`;
  const greeting = position.trim()
    ? `Dear ${name}, (${position}),`
    : `Dear ${name},`;
  const body = [
    greeting,
    "",
    "Your meal quota is now active. Please find your personal identification barcode via the link below:",
    "",
    barcodeUrl,
    "",
    "Important:",
    "- Please keep this barcode confidential.",
    "- Scan this barcode at the designated terminal during your scheduled meal time.",
    "",
    "Best regards,",
    "IT Administration Team",
    "Meal Quota System",
  ].join("\n");

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
