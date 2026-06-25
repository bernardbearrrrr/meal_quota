<?php

namespace App\Mail;

use App\Models\Employee;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BarcodeDistributed extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Employee $employee,
        public string $qrCodeImage,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Cafeteria Meal Barcode',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.barcode-distributed',
            with: [
                'employeeName' => $this->employee->name,
                'qrCodeBase64' => base64_encode($this->qrCodeImage),
            ],
        );
    }

    /**
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->qrCodeImage, 'meal-barcode.png')
                ->withMime('image/png'),
        ];
    }
}
