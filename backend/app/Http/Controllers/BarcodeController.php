<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Services\QrCodePngGenerator;
use Illuminate\Http\Response;

class BarcodeController extends Controller
{
    public function show(string $uid): Response
    {
        $employee = Employee::query()
            ->where('uid', $uid)
            ->where('is_active', true)
            ->first();

        if (! $employee) {
            abort(404, 'Barcode not found.');
        }

        $png = app(QrCodePngGenerator::class)->generate($employee->uid, 300, 2);

        return response($png, 200, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
