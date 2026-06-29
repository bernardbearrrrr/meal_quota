<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;

class ITController extends Controller
{
    private const LOG_LINE_LIMIT = 500;

    public function indexUsers(): JsonResponse
    {
        $users = User::query()
            ->orderBy('id')
            ->get(['id', 'name', 'email', 'role']);

        return response()->json([
            'data' => $users,
        ]);
    }

    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['nullable', 'string', 'min:6', 'max:255'],
        ]);

        $user = User::query()->findOrFail($id);

        $newPassword = $validated['password'] ?? 'password123';
        $user->password = Hash::make($newPassword);
        $user->save();

        return response()->json([
            'message' => "Password for {$user->name} has been reset.",
        ]);
    }

    public function getSettings(): JsonResponse
    {
        return response()->json([
            'data' => [
                'maintenance_mode' => (bool) SystemSetting::getValue('maintenance_mode', false),
                'meal_windows' => SystemSetting::getValue('meal_windows', $this->defaultMealWindows()),
            ],
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'maintenance_mode' => ['required', 'boolean'],
            'meal_windows' => ['required', 'array'],
            'meal_windows.breakfast.start' => ['required', 'date_format:H:i'],
            'meal_windows.breakfast.end' => ['required', 'date_format:H:i'],
            'meal_windows.lunch.start' => ['required', 'date_format:H:i'],
            'meal_windows.lunch.end' => ['required', 'date_format:H:i'],
            'meal_windows.dinner.start' => ['required', 'date_format:H:i'],
            'meal_windows.dinner.end' => ['required', 'date_format:H:i'],
        ]);

        SystemSetting::setValue('maintenance_mode', $validated['maintenance_mode']);
        SystemSetting::setValue('meal_windows', [
            'breakfast' => $validated['meal_windows']['breakfast'],
            'lunch' => $validated['meal_windows']['lunch'],
            'dinner' => $validated['meal_windows']['dinner'],
        ]);

        return response()->json([
            'message' => 'System settings updated successfully.',
            'data' => [
                'maintenance_mode' => (bool) SystemSetting::getValue('maintenance_mode', false),
                'meal_windows' => SystemSetting::getValue('meal_windows', $this->defaultMealWindows()),
            ],
        ]);
    }

    public function logs(): JsonResponse
    {
        $path = storage_path('logs/laravel.log');

        if (! File::exists($path)) {
            return response()->json([
                'data' => [],
                'meta' => ['total' => 0],
            ]);
        }

        $lines = $this->readLastLines($path, self::LOG_LINE_LIMIT);
        $entries = [];

        foreach ($lines as $line) {
            if (preg_match('/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]\s+[\w-]+\.(\w+):\s*(.*)$/', $line, $matches)) {
                $message = trim($matches[3]);

                if (mb_strlen($message) > 300) {
                    $message = mb_substr($message, 0, 300).'…';
                }

                $entries[] = [
                    'timestamp' => $matches[1],
                    'level' => strtoupper($matches[2]),
                    'message' => $message,
                ];
            }
        }

        // Newest entries first.
        $entries = array_reverse($entries);

        return response()->json([
            'data' => $entries,
            'meta' => ['total' => count($entries)],
        ]);
    }

    /**
     * Read up to the last N lines of a file without loading huge files fully.
     *
     * @return array<int, string>
     */
    private function readLastLines(string $path, int $limit): array
    {
        $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        if ($lines === false) {
            return [];
        }

        return array_slice($lines, -$limit);
    }

    /**
     * @return array<string, array{start: string, end: string}>
     */
    private function defaultMealWindows(): array
    {
        return [
            'breakfast' => ['start' => '07:00', 'end' => '08:59'],
            'lunch' => ['start' => '11:00', 'end' => '14:00'],
            'dinner' => ['start' => '17:00', 'end' => '19:00'],
        ];
    }
}
