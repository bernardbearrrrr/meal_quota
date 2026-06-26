import { API_BASE_URL } from "./api";

type BarcodeEmailEmployee = {
  email: string;
  name: string;
  uid: string;
};

export function getBarcodeImageUrl(uid: string): string {
  const baseUrl = API_BASE_URL || "https://mealquota-production.up.railway.app/api/v1";
  return `${baseUrl.replace(/\/+$/, "")}/barcodes/${encodeURIComponent(uid)}.png`;
}

export function buildBarcodeDraftEmail(employee: BarcodeEmailEmployee): {
  to: string;
  subject: string;
  body: string;
  mailtoUrl: string;
} {
  const barcodeUrl = getBarcodeImageUrl(employee.uid);
  const subject = `[Action Required] Your Meal Quota Barcode - ${employee.name}`;
  const body = [
    `Dear ${employee.name},`,
    "",
    "We are pleased to inform you that your meal quota has been successfully registered. Please find your personal identification barcode below to access your meals.",
    "",
    "Barcode Image:",
    barcodeUrl,
    "",
    "Important:",
    "",
    "Please keep this barcode confidential.",
    "",
    "Scan this barcode at the designated terminal during your scheduled meal time.",
    "",
    "Should you have any questions or encounter any issues, please do not hesitate to contact the IT Administration team.",
    "",
    "Best regards,",
    "IT Administration Team",
    "Meal Quota System",
  ].join("\n");

  const mailtoUrl = `mailto:${encodeURIComponent(employee.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return {
    to: employee.email,
    subject,
    body,
    mailtoUrl,
  };
}

export function openBarcodeDraftEmail(employee: BarcodeEmailEmployee): void {
  const { mailtoUrl } = buildBarcodeDraftEmail(employee);
  window.location.href = mailtoUrl;
}
