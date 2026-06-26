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
  const subject = `Barcode Meal Quota - ${employee.name}`;
  const body = [
    `Hello ${employee.name},`,
    "",
    "Your personal meal barcode for the cafeteria is ready.",
    "",
    "You can view and save your barcode image using this link:",
    barcodeUrl,
    "",
    "Please save this barcode to your phone and present it at the cafeteria scanner each day to redeem your meal quota.",
    "",
    "This barcode is personal and non-transferable.",
    "",
    "Thank you,",
    "HRD Meal Quota System",
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
