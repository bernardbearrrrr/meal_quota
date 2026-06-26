const PRODUCTION_API_BASE_URL = "https://mealquota-production.up.railway.app/api/v1";

export type BarcodeEmailRecipient = {
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

export function buildBarcodeDraftMailto({ email, name, position, uid }: BarcodeEmailRecipient): string {
  const barcodeUrl = getBarcodeImageUrl(uid);
  const subject = `[Action Required] Your Meal Quota Barcode - ${name}`;
  const body = [
    `Dear ${name}, ${position},`,
    "",
    "Your meal quota is now active. Please find your personal identification barcode below to access your meals.",
    "",
    `Please find your identification barcode below or via this link: ${barcodeUrl}`,
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
  ].join("\r\n");

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function openOutlookDraftEmail(recipient: BarcodeEmailRecipient): void {
  const mailtoLink = buildBarcodeDraftMailto(recipient);

  const link = document.createElement("a");
  link.href = mailtoLink;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
