<?php

namespace App\Console\Commands;

use App\Services\Notifications\AppointmentReminderScanner;
use App\Support\Tenancy\ActiveTenantIterator;
use Illuminate\Console\Command;

class RemindersScanCommand extends Command
{
    protected $signature = 'tallersaas:reminders-scan';

    protected $description = 'Encola recordatorios automáticos de citas por tenant';

    public function handle(
        ActiveTenantIterator $tenants,
        AppointmentReminderScanner $appointments,
    ): int {
        $totals = ['cita_dias' => 0, 'cita_2h' => 0];

        $tenants->each(function () use ($appointments, &$totals): void {
            $citas = $appointments->scan();
            $totals['cita_dias'] += $citas['cita_dias'];
            $totals['cita_2h'] += $citas['cita_2h'];
        });

        $this->info(sprintf(
            'Encolados: %d (citas 48h), %d (citas 2h)',
            $totals['cita_dias'],
            $totals['cita_2h'],
        ));

        return self::SUCCESS;
    }
}
