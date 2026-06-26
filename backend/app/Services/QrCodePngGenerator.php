<?php

namespace App\Services;

use BaconQrCode\Common\ErrorCorrectionLevel;
use BaconQrCode\Encoder\Encoder;
use RuntimeException;

class QrCodePngGenerator
{
    public function generate(string $text, int $size = 300, int $margin = 2): string
    {
        if (! extension_loaded('gd')) {
            throw new RuntimeException('The gd extension is required to generate PNG QR codes.');
        }

        $qrCode = Encoder::encode($text, ErrorCorrectionLevel::L());
        $matrix = $qrCode->getMatrix();
        $matrixSize = $matrix->getWidth();
        $totalModules = $matrixSize + ($margin * 2);
        $moduleSize = max(1, (int) floor($size / $totalModules));
        $imageSize = $moduleSize * $totalModules;

        $image = imagecreatetruecolor($imageSize, $imageSize);

        if ($image === false) {
            throw new RuntimeException('Unable to create QR code image.');
        }

        $white = imagecolorallocate($image, 255, 255, 255);
        $black = imagecolorallocate($image, 0, 0, 0);
        imagefill($image, 0, 0, $white);

        for ($y = 0; $y < $matrixSize; $y++) {
            for ($x = 0; $x < $matrixSize; $x++) {
                if (! $matrix->get($x, $y)) {
                    continue;
                }

                $left = ($x + $margin) * $moduleSize;
                $top = ($y + $margin) * $moduleSize;
                imagefilledrectangle(
                    $image,
                    $left,
                    $top,
                    $left + $moduleSize - 1,
                    $top + $moduleSize - 1,
                    $black,
                );
            }
        }

        ob_start();
        imagepng($image);
        $pngData = ob_get_clean() ?: '';
        imagedestroy($image);

        if ($pngData === '') {
            throw new RuntimeException('Unable to encode QR code PNG.');
        }

        return $pngData;
    }
}
