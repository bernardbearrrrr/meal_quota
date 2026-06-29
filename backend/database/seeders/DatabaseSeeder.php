<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $users = [
            ['name' => 'IT Super Admin', 'email' => 'it@mealquota.test', 'role' => 'it'],
            ['name' => 'Admin HRD', 'email' => 'hrd@mealquota.test', 'role' => 'admin'],
            ['name' => 'Kantin Operator', 'email' => 'operator@mealquota.test', 'role' => 'operator'],
        ];

        foreach ($users as $user) {
            User::query()->updateOrCreate(
                ['email' => $user['email']],
                [
                    'name' => $user['name'],
                    'role' => $user['role'],
                    'password' => Hash::make('password'),
                ],
            );
        }

        $this->call(SystemSettingsSeeder::class);
    }
}
