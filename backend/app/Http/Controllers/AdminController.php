<?php

namespace App\Http\Controllers;

use App\Mail\BarcodeDistributed;
use App\Models\Employee;
use App\Models\MealLog;
use App\Support\QrCode;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function indexEmployees(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'quota' => ['nullable', 'integer', 'min:0', 'max:50'],
        ]);

        $query = Employee::query()->orderBy('name');

        if (! empty($validated['name'])) {
            $query->where('name', 'like', "%{$validated['name']}%");
        }

        if (! empty($validated['department'])) {
            $query->where('department', 'like', "%{$validated['department']}%");
        }

        if (isset($validated['quota'])) {
            $query->where('quota_today', $validated['quota']);
        }

        $employees = $query->get();

        return response()->json([
            'data' => $employees->map(fn (Employee $employee) => $this->formatEmployee($employee))->values(),
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

    public function updateQuota(Request $request, Employee $employee): JsonResponse
    {
        $validated = $request->validate([
            'quota_today' => ['required', 'integer', 'min:0', 'max:50'],
        ]);

        $employee->quota_today = $validated['quota_today'];
        $employee->save();

        return response()->json([
            'message' => "Daily quota updated to {$employee->quota_today} for today.",
            'data' => $this->formatEmployee($employee),
        ]);
    }

    /**
     * Hourly / daily / monthly meal trend for the dashboard chart.
     */
    public function analytics(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'range' => ['nullable', 'string', 'in:today,week,month,year'],
        ]);

        $range = $validated['range'] ?? 'today';
        $now = now();

        [$start, $end, $granularity] = match ($range) {
            'week' => [$now->copy()->startOfWeek(), $now->copy()->endOfWeek(), 'day'],
            'month' => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth(), 'day'],
            'year' => [$now->copy()->startOfYear(), $now->copy()->endOfYear(), 'month'],
            default => [$now->copy()->startOfDay(), $now->copy()->endOfDay(), 'hour'],
        };

        $logs = MealLog::query()
            ->whereBetween('served_at', [$start, $end])
            ->get(['served_at']);

        $points = [];

        if ($granularity === 'hour') {
            for ($hour = 0; $hour < 24; $hour++) {
                $points[sprintf('%02d:00', $hour)] = 0;
            }

            foreach ($logs as $log) {
                $key = $log->served_at->format('H').':00';
                $points[$key] = ($points[$key] ?? 0) + 1;
            }
        } elseif ($granularity === 'day') {
            $cursor = $start->copy();

            while ($cursor <= $end) {
                $points[$cursor->format('d/m')] = 0;
                $cursor->addDay();
            }

            foreach ($logs as $log) {
                $key = $log->served_at->format('d/m');
                $points[$key] = ($points[$key] ?? 0) + 1;
            }
        } else {
            for ($month = 1; $month <= 12; $month++) {
                $points[Carbon::create(null, $month, 1)->format('M')] = 0;
            }

            foreach ($logs as $log) {
                $key = $log->served_at->format('M');
                $points[$key] = ($points[$key] ?? 0) + 1;
            }
        }

        $data = collect($points)
            ->map(fn (int $count, string $label) => ['label' => $label, 'count' => $count])
            ->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'range' => $range,
                'granularity' => $granularity,
                'total' => $logs->count(),
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
            ],
        ]);
    }

    /**
     * Comprehensive report with multi-criteria filters and summary stats.
     */
    public function report(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'name' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'meal_type' => ['nullable', 'string', 'in:breakfast,lunch,dinner,other'],
        ]);

        $query = MealLog::query()
            ->with('employee:id,name,department')
            ->orderByDesc('served_at');

        if (! empty($validated['start_date'])) {
            $query->whereDate('meal_date', '>=', $validated['start_date']);
        }

        if (! empty($validated['end_date'])) {
            $query->whereDate('meal_date', '<=', $validated['end_date']);
        }

        if (! empty($validated['name'])) {
            $name = $validated['name'];
            $query->whereHas('employee', fn ($q) => $q->where('name', 'like', "%{$name}%"));
        }

        if (! empty($validated['department'])) {
            $department = $validated['department'];
            $query->whereHas('employee', fn ($q) => $q->where('department', 'like', "%{$department}%"));
        }

        if (! empty($validated['meal_type'])) {
            $query->mealType($validated['meal_type']);
        }

        $logs = $query->get();

        $byType = ['breakfast' => 0, 'lunch' => 0, 'dinner' => 0, 'other' => 0];
        $byDepartment = [];

        $rows = $logs->map(function (MealLog $log) use (&$byType, &$byDepartment) {
            $type = $log->meal_type;
            $byType[$type] = ($byType[$type] ?? 0) + 1;

            $department = $log->employee?->department ?? 'Unknown';
            $byDepartment[$department] = ($byDepartment[$department] ?? 0) + 1;

            return [
                'id' => $log->id,
                'name' => $log->employee?->name ?? 'Unknown',
                'department' => $department,
                'meal_date' => $log->meal_date->format('d/m/Y'),
                'served_at' => $log->served_at->format('H:i:s'),
                'meal_type' => $type,
            ];
        })->values();

        $topMealType = collect($byType)->filter()->sortDesc()->keys()->first();
        $topDepartment = collect($byDepartment)->sortDesc()->keys()->first();

        return response()->json([
            'data' => $rows,
            'summary' => [
                'total' => $logs->count(),
                'by_type' => $byType,
                'top_meal_type' => $topMealType,
                'top_department' => $topDepartment,
                'unique_employees' => $logs->pluck('employee_id')->unique()->count(),
            ],
        ]);
    }

    private function sendBarcodeEmail(Employee $employee): void
    {
        $qrCodeImage = QrCode::format('png')
            ->driver('gd')
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
            'quota_today' => $employee->quota_today,
            'created_at' => $employee->created_at,
            'updated_at' => $employee->updated_at,
        ];
    }
}
