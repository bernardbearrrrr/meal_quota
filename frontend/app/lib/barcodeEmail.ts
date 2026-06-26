type BarcodeEmailEmployee = {
  email: string;
  name: string;
  uid: string;
};

const PRODUCTION_API_BASE_URL = "https://mealquota-production.up.railway.app/api/v1";

export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

  if (fromEnv) {
    return fromEnv;
  }

  return PRODUCTION_API_BASE_URL;
}

export function getBarcodeImageUrl(uid: string): string {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/barcodes/${encodeURIComponent(uid)}.png`;
}

export function buildBarcodeDraftEmail(employee: BarcodeEmailEmployee): {
  to: string;
  subject: string;
  body: string;
  mailtoUrl: string;
  barcodeUrl: string;
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

  const mailtoUrl = `mailto:${employee.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return {
    to: employee.email,
    subject,
    body,
    mailtoUrl,
    barcodeUrl,
  };
}

function openMailtoLink(mailtoUrl: string): void {
  const mailtoWindow = window.open(mailtoUrl, "_blank", "noopener,noreferrer");

  if (mailtoWindow) {
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = mailtoUrl;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function openBarcodeDraftEmail(employee: BarcodeEmailEmployee): void {
  try {
    if (typeof window === "undefined") {
      throw new Error("openBarcodeDraftEmail can only run in the browser.");
    }

    console.log("[openBarcodeDraftEmail] called with:", {
      email: employee.email,
      name: employee.name,
      uid: employee.uid,
    });

    console.log("[openBarcodeDraftEmail] NEXT_PUBLIC_API_URL:", process.env.NEXT_PUBLIC_API_URL);

    const { mailtoUrl, barcodeUrl } = buildBarcodeDraftEmail(employee);

    console.log("[openBarcodeDraftEmail] barcodeUrl:", barcodeUrl);
    console.log("[openBarcodeDraftEmail] mailtoUrl:", mailtoUrl);

    openMailtoLink(mailtoUrl);
  } catch (error) {
    console.error("[openBarcodeDraftEmail] error:", error);
    alert(
      error instanceof Error
        ? `Failed to open draft email: ${error.message}`
        : "Failed to open draft email. Please try again.",
    );
  }
}
