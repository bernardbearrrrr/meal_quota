<?php

namespace App\Http\Controllers;

use App\Mail\BarcodeDistributed;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class AdminController extends Controller
{
    public function indexEmployees(): JsonResponse
    {
        $employees = Employee::query()
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $employees,
            'meta' => [
                'total' => $employees->count(),
            ],
        ]);
    }

    public function storeEmployee(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'department' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('employees', 'email')->whereNull('deleted_at')],
        ]);

        $employee = DB::transaction(function () use ($validated) {
            $employee = Employee::create($validated);

            $this->sendBarcodeEmail($employee);

            return $employee;
        });

        return response()->json([
            'message' => 'Employee created and barcode email sent successfully.',
            'data' => $this->formatEmployee($employee),
        ], 201);
    }

    public function resendBarcode(Employee $employee): JsonResponse
    {
        $employee = DB::transaction(function () use ($employee) {
            $employee->regenerateUid();
            $this->sendBarcodeEmail($employee);

            return $employee;
        });

        return response()->json([
            'message' => 'Barcode regenerated and email sent successfully.',
            'data' => $this->formatEmployee($employee),
        ]);
    }

    private function sendBarcodeEmail(Employee $employee): void
    {
        $qrCodeImage = QrCode::format('png')
            ->size(300)
            ->margin(2)
            ->generate($employee->uid);

        Mail::to($employee->email)->send(new BarcodeDistributed($employee, $qrCodeImage));
    }

    /**
     * @return array<string, mixed>
     */
    private function formatEmployee(Employee $employee): array
    {
        return [
            'id' => $employee->id,
            'uid' => $employee->uid,
            'name' => $employee->name,
            'department' => $employee->department,
            'email' => $employee->email,
            'is_active' => $employee->is_active,
            'uid_version' => $employee->uid_version,
            'created_at' => $employee->created_at,
            'updated_at' => $employee->updated_at,
        ];
    }
}
