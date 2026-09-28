<?php

namespace App\Console\Commands;

use App\Services\Notifications\AppointmentReminderScanner;
use App\Services\Notifications\MantenimientoReminderScanner;
use App\Support\Tenancy\ActiveTenantIterator;
use Illuminate\Console\Command;

class RemindersScanCommand extends Command
{
    protected $signature = 'tallersaas:reminders-scan';

    protected $description = 'Encola recordatorios de citas y de mantenimiento por tenant';

    public function handle(
        ActiveTenantIterator $tenants,
        AppointmentReminderScanner $appointments,
        MantenimientoReminderScanner $mantenimiento,
    ): int {
        $totals = ['cita_dias' => 0, 'cita_2h' => 0, 'mantenimiento' => 0];

        $tenants->each(function () use ($appointments, $mantenimiento, &$totals): void {
            $citas = $appointments->scan();
            $totals['cita_dias'] += $citas['cita_dias'];
            $totals['cita_2h'] += $citas['cita_2h'];
            $totals['mantenimiento'] += $mantenimiento->scan();
        });

        $this->info(sprintf(
            'Encolados: %d (citas 48h), %d (citas 2h), %d (mantenimiento)',
            $totals['cita_dias'],
            $totals['cita_2h'],
            $totals['mantenimiento'],
        ));

        return self::SUCCESS;
    }
}
