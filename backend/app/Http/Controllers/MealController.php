<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\MealLog;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MealController extends Controller
{
    /**
     * Current meal windows configured by IT, falling back to defaults.
     *
     * @return array<string, array{start: string, end: string}>|null
     */
    private function mealWindows(): ?array
    {
        $windows = SystemSetting::getValue('meal_windows');

        return is_array($windows) && $windows !== [] ? $windows : null;
    }

    public function indexLogs(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'meal_type' => ['nullable', 'string', 'in:breakfast,lunch,dinner,other'],
            'meal_types' => ['nullable', 'array'],
            'meal_types.*' => ['string', 'in:breakfast,lunch,dinner,other'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'show_all' => ['nullable', 'boolean'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50,100'],
        ]);

        $showAll = $request->boolean('show_all');

        $query = MealLog::query()
            ->with('employee:id,name,department,type,employee_id')
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

        if (! empty($validated['meal_types'])) {
            $query->whereIn('meal_type', $validated['meal_types']);
        }

        if (! $showAll) {
            if (! empty($validated['start_date'])) {
                $query->whereDate('meal_date', '>=', $validated['start_date']);
            }

            if (! empty($validated['end_date'])) {
                $query->whereDate('meal_date', '<=', $validated['end_date']);
            }
        }

        $perPage = (int) ($validated['per_page'] ?? 10);
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

    public function dashboard(Request $request): JsonResponse
    {
        $today = today();

        $todayLogs = MealLog::query()->whereDate('meal_date', $today);

        $totalToday = (clone $todayLogs)->count();

        $byTypeRaw = (clone $todayLogs)
            ->selectRaw('meal_type, COUNT(*) as total')
            ->groupBy('meal_type')
            ->pluck('total', 'meal_type');

        $byType = [
            'breakfast' => (int) ($byTypeRaw['breakfast'] ?? 0),
            'lunch' => (int) ($byTypeRaw['lunch'] ?? 0),
            'dinner' => (int) ($byTypeRaw['dinner'] ?? 0),
            'other' => (int) ($byTypeRaw['other'] ?? 0),
        ];

        $recent = MealLog::query()
            ->with('employee:id,name,department,type,employee_id')
            ->orderByDesc('served_at')
            ->limit(5)
            ->get()
            ->map(fn (MealLog $log) => $this->formatLog($log))
            ->values();

        return response()->json([
            'total_today' => $totalToday,
            'by_type' => $byType,
            'recent' => $recent,
        ]);
    }

    public function destroyLog(int $id): JsonResponse
    {
        $result = DB::transaction(function () use ($id) {
            $log = MealLog::query()->lockForUpdate()->find($id);

            if (! $log) {
                return [
                    'http_status' => 404,
                    'message' => 'Meal log not found.',
                ];
            }

            // Quota validation is based on counting today's logs, so deleting the
            // record alone restores the employee's available quota for the day.
            $log->delete();

            return [
                'http_status' => 200,
                'message' => 'Meal record voided successfully. Employee quota has been restored.',
            ];
        });

        $httpStatus = $result['http_status'];
        unset($result['http_status']);

        return response()->json($result, $httpStatus);
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

            $servedAt = now();

            $log = MealLog::create([
                'employee_id' => $employee->id,
                'meal_date' => today(),
                'served_at' => $servedAt,
                'meal_type' => MealLog::resolveMealType($servedAt, $this->mealWindows()),
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
                'type' => $log->employee?->type ?? 'associate',
                'employee_id' => $log->employee?->employee_id,
            ],
            'meal_date' => $log->meal_date->format('Y-m-d'),
            'served_at' => $log->served_at->format('l, d/m/Y H:i:s'),
            'meal_type' => $log->meal_type,
        ];
    }
}
