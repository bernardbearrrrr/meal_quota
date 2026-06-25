<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\MealLog;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MealController extends Controller
{
    public function indexLogs(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'show_all' => ['nullable', 'boolean'],
            'page' => ['nullable', 'integer', 'min:1'],
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

        if (! $showAll) {
            if (! empty($validated['start_date'])) {
                $query->whereDate('meal_date', '>=', $validated['start_date']);
            }

            if (! empty($validated['end_date'])) {
                $query->whereDate('meal_date', '<=', $validated['end_date']);
            }
        }

        $paginator = $query->paginate(20);

        return response()->json([
            'data' => collect($paginator->items())->map(function (MealLog $log) {
                return [
                    'id' => $log->id,
                    'employee' => [
                        'name' => $log->employee?->name,
                        'department' => $log->employee?->department,
                    ],
                    'meal_date' => $log->meal_date->format('Y-m-d'),
                    'served_at' => $log->served_at->format('l, d/m/Y H:i:s'),
                ];
            })->values(),
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

            if (! $employee || ! $employee->is_active) {
                return [
                    'status' => 'DENIED',
                    'http_status' => 422,
                    'message' => 'Employee not found or inactive.',
                ];
            }

            $existingLog = MealLog::query()
                ->where('employee_id', $employee->id)
                ->whereDate('meal_date', today())
                ->lockForUpdate()
                ->exists();

            if ($existingLog) {
                return [
                    'status' => 'ALREADY_CLAIMED',
                    'http_status' => 409,
                    'message' => 'Employee has already claimed their meal today.',
                ];
            }

            try {
                MealLog::create([
                    'employee_id' => $employee->id,
                    'meal_date' => today(),
                    'served_at' => now(),
                    'ip_address' => $request->ip(),
                ]);
            } catch (UniqueConstraintViolationException) {
                return [
                    'status' => 'ALREADY_CLAIMED',
                    'http_status' => 409,
                    'message' => 'Employee has already claimed their meal today.',
                ];
            }

            return [
                'status' => 'GRANTED',
                'http_status' => 200,
                'employee' => [
                    'name' => $employee->name,
                    'department' => $employee->department,
                ],
            ];
        });

        $httpStatus = $result['http_status'];
        unset($result['http_status']);

        return response()->json($result, $httpStatus);
    }
}
