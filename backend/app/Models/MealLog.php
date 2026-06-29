<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MealLog extends Model
{
    public $timestamps = false;

    /**
     * Time windows used to categorise a scan into a meal type.
     *
     * @var array<string, array{0: string, 1: string}>
     */
    public const MEAL_WINDOWS = [
        'breakfast' => ['07:00:00', '08:59:59'],
        'lunch' => ['11:00:00', '14:00:00'],
        'dinner' => ['17:00:00', '19:00:00'],
    ];

    protected $fillable = [
        'employee_id',
        'meal_date',
        'served_at',
        'meal_type',
        'verified_by',
        'ip_address',
    ];

    protected $casts = [
        'meal_date' => 'date',
        'served_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Resolve a meal type label from a timestamp against the given windows.
     * Falls back to the legacy default windows when none are supplied.
     *
     * @param  array<string, array{start: string, end: string}>|null  $windows
     */
    public static function resolveMealType(?CarbonInterface $time, ?array $windows = null): string
    {
        if (! $time) {
            return 'other';
        }

        $clock = $time->format('H:i');

        if ($windows === null) {
            $windows = [];

            foreach (self::MEAL_WINDOWS as $type => [$start, $end]) {
                $windows[$type] = ['start' => substr($start, 0, 5), 'end' => substr($end, 0, 5)];
            }
        }

        foreach ($windows as $type => $window) {
            $start = $window['start'] ?? null;
            $end = $window['end'] ?? null;

            if ($start && $end && $clock >= $start && $clock <= $end) {
                return $type;
            }
        }

        return 'other';
    }

    /**
     * Restrict a query to logs of a stored meal type.
     */
    public function scopeMealType(Builder $query, ?string $type): Builder
    {
        if (! $type) {
            return $query;
        }

        return $query->where('meal_type', $type);
    }
}
