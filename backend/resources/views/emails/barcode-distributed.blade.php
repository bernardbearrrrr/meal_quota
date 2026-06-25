<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Cafeteria Meal Barcode</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: Arial, Helvetica, sans-serif; color: #1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f8; padding: 32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">
                    <tr>
                        <td style="background-color: #1e40af; padding: 24px 32px;">
                            <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #ffffff;">Meal Quota System</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px;">
                            <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5;">Hello {{ $employeeName }},</p>
                            <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
                                Your personal meal barcode has been issued. Please save the QR code image below to your phone gallery and present it at the cafeteria scanner each day to redeem your meal quota.
                            </p>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
                                        <img src="data:image/png;base64,{{ $qrCodeBase64 }}" alt="Your meal barcode" width="240" height="240" style="display: block; margin: 0 auto;">
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                A copy of this barcode is also attached to this email. Long-press the image on your phone and choose <strong>Save to Photos</strong> (or your gallery app) for quick access at the cafeteria.
                            </p>
                            <p style="margin: 16px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                This barcode is personal and non-transferable. One meal may be redeemed per day.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9ca3af;">
                                This is an automated message from the HRD Meal Quota System. Please do not reply to this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
