<?php

namespace App\Services;

use App\Models\Employee;
use Illuminate\Support\Facades\View;
use Resend;
use RuntimeException;

class ResendBarcodeMailer
{
    public function send(Employee $employee, string $qrCodePng): void
    {
        $apiKey = config('services.resend.key');

        if (empty($apiKey)) {
            throw new RuntimeException('RESEND_API_KEY is not configured.');
        }

        $fromEmail = config('services.resend.from');
        $fromName = config('services.resend.from_name', 'Meal Quota System');

        if (empty($fromEmail)) {
            throw new RuntimeException('RESEND_FROM_EMAIL is not configured.');
        }

        $qrCodeBase64 = base64_encode($qrCodePng);

        $html = View::make('emails.barcode-distributed', [
            'employeeName' => $employee->name,
            'qrCodeBase64' => $qrCodeBase64,
        ])->render();

        Resend::client($apiKey)->emails->send([
            'from' => "{$fromName} <{$fromEmail}>",
            'to' => [$employee->email],
            'subject' => 'Your Cafeteria Meal Barcode',
            'html' => $html,
            'attachments' => [
                [
                    'filename' => 'meal-barcode.png',
                    'content' => $qrCodeBase64,
                ],
            ],
        ]);
    }
}
