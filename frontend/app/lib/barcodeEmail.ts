export const openBarcodeDraftEmail = (email: string, name: string, uid: string) => {
  const barcodeUrl = `${process.env.NEXT_PUBLIC_API_URL}/barcodes/${uid}.png`;
  const subject = `[Action Required] Your Meal Quota Barcode - ${name}`;
  const body = [
    `Dear ${name},`,
    "",
    "We are pleased to inform you that your meal quota has been successfully registered.",
    "Please find your personal identification barcode below to access your meals.",
    "",
    "Barcode Image:",
    barcodeUrl,
    "",
    "Important:",
    "- Please keep this barcode confidential.",
    "- Scan this barcode at the designated terminal during your scheduled meal time.",
    "",
    "Best regards,",
    "IT Administration Team",
    "Meal Quota System"
  ].join("\n");

  const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // Teknik Hidden Anchor agar tidak ada layar putih
  const link = document.createElement('a');
  link.href = mailtoLink;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
