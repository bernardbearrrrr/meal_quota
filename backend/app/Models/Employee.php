<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Employee extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'department',
        'position',
        'email',
        'status',
        'is_active',
        'uid_version',
        'quota_today',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'uid_version' => 'integer',
            'quota_today' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Employee $employee) {
            if (empty($employee->uid)) {
                $employee->uid = 'EMP-'.Str::upper(Str::random(16));
            }

            if (empty($employee->status)) {
                $employee->status = 'active';
            }

            $employee->is_active = ($employee->status ?? 'active') === 'active';
        });

        static::saving(function (Employee $employee) {
            if ($employee->isDirty('status')) {
                $employee->is_active = $employee->status === 'active';
            }
        });
    }

    public function mealLogs(): HasMany
    {
        return $this->hasMany(MealLog::class);
    }

    public function regenerateUid(): void
    {
        $this->uid = 'EMP-'.Str::upper(Str::random(16));
        $this->uid_version = ($this->uid_version ?? 1) + 1;
        $this->save();
    }
}
