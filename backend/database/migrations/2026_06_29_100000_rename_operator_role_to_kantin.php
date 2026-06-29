<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('users')->where('role', 'operator')->update(['role' => 'kantin']);

        DB::table('users')
            ->where('email', 'operator@mealquota.test')
            ->update(['email' => 'kantin@mealquota.test']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('users')
            ->where('email', 'kantin@mealquota.test')
            ->update(['email' => 'operator@mealquota.test']);

        DB::table('users')->where('role', 'kantin')->update(['role' => 'operator']);
    }
};
