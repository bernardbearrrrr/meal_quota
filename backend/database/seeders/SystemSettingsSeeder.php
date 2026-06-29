<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

class SystemSettingsSeeder extends Seeder
{
    public function run(): void
    {
        SystemSetting::setValue('maintenance_mode', false);

        SystemSetting::setValue('meal_windows', [
            'breakfast' => ['start' => '07:00', 'end' => '08:59'],
            'lunch' => ['start' => '11:00', 'end' => '14:00'],
            'dinner' => ['start' => '17:00', 'end' => '19:00'],
        ]);
    }
}
