<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Persist the meal type at scan time so historical logs remain immutable
     * even if IT changes the meal windows later. Existing rows are backfilled
     * from their served_at timestamp using the legacy default windows.
     */
    public function up(): void
    {
        Schema::table('meal_logs', function (Blueprint $table) {
            $table->string('meal_type')->nullable()->after('served_at');
        });

        DB::table('meal_logs')->whereNull('meal_type')->update([
            'meal_type' => DB::raw(
                "CASE
                    WHEN TIME(served_at) BETWEEN '07:00:00' AND '08:59:59' THEN 'breakfast'
                    WHEN TIME(served_at) BETWEEN '11:00:00' AND '14:00:00' THEN 'lunch'
                    WHEN TIME(served_at) BETWEEN '17:00:00' AND '19:00:00' THEN 'dinner'
                    ELSE 'other'
                END"
            ),
        ]);
    }

    public function down(): void
    {
        Schema::table('meal_logs', function (Blueprint $table) {
            $table->dropColumn('meal_type');
        });
    }
};
