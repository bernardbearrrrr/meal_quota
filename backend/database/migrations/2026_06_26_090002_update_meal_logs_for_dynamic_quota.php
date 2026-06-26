<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Dynamic daily quota allows an employee to claim more than one meal per
     * day, so the old unique (employee_id, meal_date) constraint is replaced
     * with a plain composite index. Concurrency safety is enforced in the
     * application layer (lockForUpdate + count vs quota_today).
     */
    public function up(): void
    {
        Schema::table('meal_logs', function (Blueprint $table) {
            // Add a covering index first so the employee_id foreign key keeps an index.
            $table->index(['employee_id', 'meal_date'], 'meal_logs_emp_date_idx');
        });

        Schema::table('meal_logs', function (Blueprint $table) {
            $table->dropUnique('meal_logs_employee_id_meal_date_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('meal_logs', function (Blueprint $table) {
            $table->unique(['employee_id', 'meal_date'], 'meal_logs_employee_id_meal_date_unique');
        });

        Schema::table('meal_logs', function (Blueprint $table) {
            $table->dropIndex('meal_logs_emp_date_idx');
        });
    }
};
