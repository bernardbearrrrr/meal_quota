<?php

namespace App\Console\Commands;

use App\Models\Employee;
use Illuminate\Console\Command;

class ResetDailyQuota extends Command
{
    /**
     * @var string
     */
    protected $signature = 'quota:reset {--value=1 : The quota value to reset every employee to}';

    /**
     * @var string
     */
    protected $description = 'Reset every employee daily meal quota back to the default (runs daily at midnight).';

    public function handle(): int
    {
        $value = (int) $this->option('value');

        $affected = Employee::query()->update(['quota_today' => $value]);

        $this->info("Daily quota reset to {$value} for {$affected} employee(s).");

        return self::SUCCESS;
    }
}
