<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->enum('status', ['active', 'inactive'])->default('active')->after('email');
        });

        DB::table('employees')->update([
            'status' => DB::raw("CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END"),
        ]);
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
