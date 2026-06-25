<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MealLog extends Model
{
    public $timestamps = false;

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
}
