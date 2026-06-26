<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\MealLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MealController extends Controller
{
    public function indexLogs(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'meal_type' => ['nullable', 'string', 'in:breakfast,lunch,dinner,other'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'show_all' => ['nullable', 'boolean'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $showAll = $request->boolean('show_all');

        $query = MealLog::query()
            ->with('employee:id,name,department')
            ->orderByDesc('served_at');

        if (! empty($validated['search'])) {
            $search = $validated['search'];

            $query->whereHas('employee', function ($employeeQuery) use ($search) {
                $employeeQuery
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('department', 'like', "%{$search}%");
            });
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

        if (! $showAll) {
            if (! empty($validated['start_date'])) {
                $query->whereDate('meal_date', '>=', $validated['start_date']);
            }

            if (! empty($validated['end_date'])) {
                $query->whereDate('meal_date', '<=', $validated['end_date']);
            }
        }

        $perPage = $validated['per_page'] ?? 20;
        $paginator = $query->paginate($perPage);

        return response()->json([
            'data' => collect($paginator->items())->map(fn (MealLog $log) => $this->formatLog($log))->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'uid' => ['required', 'string', 'max:64', 'regex:/^EMP-[A-Z0-9]+$/'],
        ]);

        $result = DB::transaction(function () use ($validated, $request) {
            $employee = Employee::query()
                ->where('uid', $validated['uid'])
                ->lockForUpdate()
                ->first();

            if (! $employee || $employee->status !== 'active') {
                return [
                    'status' => 'DENIED',
                    'http_status' => 422,
                    'message' => 'Invalid QR Code or inactive employee.',
                ];
            }

            $quota = max(0, (int) ($employee->quota_today ?? 1));

            $claimedToday = MealLog::query()
                ->where('employee_id', $employee->id)
                ->whereDate('meal_date', today())
                ->lockForUpdate()
                ->count();

            if ($claimedToday >= $quota) {
                return [
                    'status' => 'ALREADY_CLAIMED',
                    'http_status' => 409,
                    'message' => $quota <= 1
                        ? "Quota for {$employee->name} is empty today."
                        : "Quota for {$employee->name} is empty today ({$claimedToday}/{$quota}).",
                ];
            }

            $log = MealLog::create([
                'employee_id' => $employee->id,
                'meal_date' => today(),
                'served_at' => now(),
                'ip_address' => $request->ip(),
            ]);

            return [
                'status' => 'GRANTED',
                'http_status' => 200,
                'employee' => [
                    'name' => $employee->name,
                    'department' => $employee->department,
                ],
                'meal_type' => $log->meal_type,
                'quota' => [
                    'claimed_today' => $claimedToday + 1,
                    'quota_today' => $quota,
                    'remaining' => max(0, $quota - ($claimedToday + 1)),
                ],
            ];
        });

        $httpStatus = $result['http_status'];
        unset($result['http_status']);

        return response()->json($result, $httpStatus);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatLog(MealLog $log): array
    {
        return [
            'id' => $log->id,
            'employee' => [
                'name' => $log->employee?->name,
                'department' => $log->employee?->department,
            ],
            'meal_date' => $log->meal_date->format('Y-m-d'),
            'served_at' => $log->served_at->format('l, d/m/Y H:i:s'),
            'meal_type' => $log->meal_type,
        ];
    }
}
