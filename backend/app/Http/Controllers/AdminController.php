<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\MealLog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
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
        $validated = $request->validate(
            $this->employeeValidationRules($request)
        );

        if (($validated['type'] ?? 'associate') === 'intern') {
            $validated['employee_id'] = null;
        }

        $employee = Employee::create($validated);

        return response()->json([
            'message' => 'Employee created successfully.',
            'data' => $this->formatEmployee($employee),
        ], 201);
    }

    public function update(Request $request, Employee $employee): JsonResponse
    {
        $validated = $request->validate(
            $this->employeeValidationRules($request, $employee)
        );

        if (($validated['type'] ?? 'associate') === 'intern') {
            $validated['employee_id'] = null;
        }

        $employee->update($validated);

        return response()->json([
            'message' => "{$employee->name}'s details have been updated.",
            'data' => $this->formatEmployee($employee->fresh()),
        ]);
    }

    /**
     * Shared validation rules for creating and editing an employee.
     * Conditional rule: associates require a unique employee_id; interns must leave it empty.
     *
     * @return array<string, mixed>
     */
    private function employeeValidationRules(Request $request, ?Employee $employee = null): array
    {
        $emailUnique = Rule::unique('employees', 'email')->whereNull('deleted_at');
        $employeeIdUnique = Rule::unique('employees', 'employee_id')->whereNull('deleted_at');

        if ($employee) {
            $emailUnique->ignore($employee->id);
            $employeeIdUnique->ignore($employee->id);
        }

        return [
            'name' => ['required', 'string', 'max:255'],
            'department' => ['required', 'string', 'max:255'],
            'position' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', $emailUnique],
            'type' => ['required', 'string', Rule::in(['associate', 'intern'])],
            'employee_id' => [
                Rule::requiredIf(fn () => $request->input('type') === 'associate'),
                'nullable',
                'string',
                'max:255',
                $employeeIdUnique,
            ],
        ];
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ]);

        $handle = fopen($request->file('file')->getRealPath(), 'r');

        if ($handle === false) {
            return response()->json([
                'message' => 'Unable to read the uploaded file.',
            ], 422);
        }

        $headers = fgetcsv($handle);

        if ($headers === false) {
            fclose($handle);

            return response()->json([
                'message' => 'The CSV file is empty.',
            ], 422);
        }

        $expectedHeaders = ['employee_id', 'name', 'department', 'position', 'email', 'type'];
        $normalizedHeaders = array_map(
            fn ($header) => strtolower(trim((string) $header)),
            $headers,
        );

        if ($normalizedHeaders !== $expectedHeaders) {
            fclose($handle);

            return response()->json([
                'message' => 'Invalid CSV headers. Expected: employee_id, name, department, position, email, type.',
            ], 422);
        }

        $parsedRows = [];
        $lineNumber = 1;

        while (($data = fgetcsv($handle)) !== false) {
            $lineNumber++;

            if ($this->isCsvRowEmpty($data)) {
                continue;
            }

            if (count($data) < 5) {
                $parsedRows[] = [
                    'line' => $lineNumber,
                    'error' => 'Row has fewer columns than expected.',
                ];

                continue;
            }

            $type = strtolower(trim((string) ($data[5] ?? '')));

            if ($type === '') {
                $type = 'associate';
            }

            $parsedRows[] = [
                'line' => $lineNumber,
                'data' => [
                    'employee_id' => trim((string) ($data[0] ?? '')),
                    'name' => trim((string) $data[1]),
                    'department' => trim((string) $data[2]),
                    'position' => trim((string) $data[3]),
                    'email' => trim((string) $data[4]),
                    'type' => $type,
                ],
            ];
        }

        fclose($handle);

        if ($parsedRows === []) {
            return response()->json([
                'message' => 'The CSV file contains no employee data.',
            ], 422);
        }

        $errors = [];
        $validRows = [];
        $seenEmails = [];
        $seenEmployeeIds = [];

        foreach ($parsedRows as $parsedRow) {
            $line = $parsedRow['line'];

            if (isset($parsedRow['error'])) {
                $errors[] = [
                    'row' => $line,
                    'message' => $parsedRow['error'],
                ];

                continue;
            }

            $rowData = $parsedRow['data'];
            $validator = Validator::make($rowData, [
                'name' => ['required', 'string', 'max:255'],
                'department' => ['required', 'string', 'max:255'],
                'position' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255'],
                'type' => ['required', 'string', Rule::in(['associate', 'intern'])],
                'employee_id' => ['nullable', 'string', 'max:255'],
            ]);

            if ($validator->fails()) {
                $errors[] = [
                    'row' => $line,
                    'message' => $validator->errors()->first(),
                ];

                continue;
            }

            $emailKey = strtolower($rowData['email']);

            if (isset($seenEmails[$emailKey])) {
                $errors[] = [
                    'row' => $line,
                    'message' => "Duplicate email in CSV (also on row {$seenEmails[$emailKey]}).",
                ];

                continue;
            }

            $seenEmails[$emailKey] = $line;

            if (Employee::query()->where('email', $rowData['email'])->whereNull('deleted_at')->exists()) {
                $errors[] = [
                    'row' => $line,
                    'message' => 'Email has already been registered.',
                ];

                continue;
            }

            if ($rowData['type'] === 'intern') {
                $rowData['employee_id'] = null;
            } else {
                if ($rowData['employee_id'] === '') {
                    $errors[] = [
                        'row' => $line,
                        'message' => 'Employee ID is required for associates.',
                    ];

                    continue;
                }

                $employeeIdKey = strtolower($rowData['employee_id']);

                if (isset($seenEmployeeIds[$employeeIdKey])) {
                    $errors[] = [
                        'row' => $line,
                        'message' => "Duplicate employee ID in CSV (also on row {$seenEmployeeIds[$employeeIdKey]}).",
                    ];

                    continue;
                }

                $seenEmployeeIds[$employeeIdKey] = $line;

                if (Employee::query()->where('employee_id', $rowData['employee_id'])->whereNull('deleted_at')->exists()) {
                    $errors[] = [
                        'row' => $line,
                        'message' => 'Employee ID has already been registered.',
                    ];

                    continue;
                }
            }

            $validRows[] = $rowData;
        }

        if ($errors !== []) {
            return response()->json([
                'message' => 'Import failed. No employees were imported.',
                'errors' => $errors,
            ], 422);
        }

        $importedCount = DB::transaction(function () use ($validRows) {
            $count = 0;

            foreach ($validRows as $rowData) {
                Employee::create([
                    ...$rowData,
                    'status' => 'active',
                ]);
                $count++;
            }

            return $count;
        });

        return response()->json([
            'message' => "Successfully imported {$importedCount} employee".($importedCount === 1 ? '' : 's').'.',
            'data' => [
                'imported_count' => $importedCount,
            ],
        ], 201);
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

    public function updateStatus(Request $request, Employee $employee): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(['active', 'inactive'])],
        ]);

        $employee->status = $validated['status'];
        $employee->save();

        $message = $validated['status'] === 'inactive'
            ? "{$employee->name} has been marked as resigned. Barcode access is now disabled."
            : "{$employee->name} has been reactivated.";

        return response()->json([
            'message' => $message,
            'data' => $this->formatEmployee($employee),
        ]);
    }

    public function resetBarcode(Employee $employee): JsonResponse
    {
        if ($employee->status !== 'active') {
            return response()->json([
                'message' => 'Cannot reset barcode for inactive employees.',
            ], 422);
        }

        $employee->regenerateUid();

        return response()->json([
            'message' => 'Barcode successfully reset.',
            'data' => $this->formatEmployee($employee->fresh()),
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

    /**
     * @param  array<int, string|null>|false  $row
     */
    private function isCsvRowEmpty(array|false $row): bool
    {
        if ($row === false || $row === []) {
            return true;
        }

        foreach ($row as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
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
            'position' => $employee->position,
            'type' => $employee->type ?? 'associate',
            'employee_id' => $employee->employee_id,
            'email' => $employee->email,
            'status' => $employee->status ?? ($employee->is_active ? 'active' : 'inactive'),
            'is_active' => $employee->is_active,
            'uid_version' => $employee->uid_version,
            'quota_today' => $employee->quota_today,
            'created_at' => $employee->created_at,
            'updated_at' => $employee->updated_at,
        ];
    }
}
