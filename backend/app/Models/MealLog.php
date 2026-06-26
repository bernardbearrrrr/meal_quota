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
     * Resolve a meal type label from a given timestamp.
     */
    public static function resolveMealType(?CarbonInterface $time): string
    {
        if (! $time) {
            return 'other';
        }

        $clock = $time->format('H:i:s');

        foreach (self::MEAL_WINDOWS as $type => [$start, $end]) {
            if ($clock >= $start && $clock <= $end) {
                return $type;
            }
        }

        return 'other';
    }

    /**
     * Computed meal type accessor (breakfast | lunch | dinner | other).
     */
    public function getMealTypeAttribute(): string
    {
        return self::resolveMealType($this->served_at);
    }

    /**
     * Restrict a query to scans that fall inside a meal type window.
     */
    public function scopeMealType(Builder $query, ?string $type): Builder
    {
        if (! $type || ! array_key_exists($type, self::MEAL_WINDOWS)) {
            return $query;
        }

        [$start, $end] = self::MEAL_WINDOWS[$type];

        return $query
            ->whereTime('served_at', '>=', $start)
            ->whereTime('served_at', '<=', $end);
    }
}
