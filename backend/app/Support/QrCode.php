<?php

namespace App\Support;

use App\Services\QrCodePngGenerator;
use InvalidArgumentException;
use SimpleSoftwareIO\QrCode\Facades\QrCode as SimpleQrCode;

class QrCode
{
    public static function format(string $format): QrCodeBuilder
    {
        return new QrCodeBuilder($format);
    }
}

class QrCodeBuilder
{
    private string $driver = 'gd';

    private int $size = 300;

    private int $margin = 2;

    public function __construct(private readonly string $format) {}

    public function driver(string $driver): self
    {
        $this->driver = strtolower($driver);

        return $this;
    }

    public function size(int $pixels): self
    {
        $this->size = $pixels;

        return $this;
    }

    public function margin(int $margin): self
    {
        $this->margin = $margin;

        return $this;
    }

    public function generate(string $text): string
    {
        if ($this->format === 'png') {
            if ($this->driver !== 'gd') {
                throw new InvalidArgumentException('PNG QR codes on this server must use the gd driver.');
            }

            return app(QrCodePngGenerator::class)->generate($text, $this->size, $this->margin);
        }

        return (string) SimpleQrCode::format($this->format)
            ->size($this->size)
            ->margin($this->margin)
            ->generate($text);
    }
}
