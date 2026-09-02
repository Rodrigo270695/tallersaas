<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;

class ResetTenantOnboardingCommand extends Command
{
    protected $signature = 'tallersaas:onboarding-reset {slug : Slug del taller (subdominio)}';

    protected $description = 'Reinicia el checklist de onboarding de un taller para pruebas';

    public function handle(): int
    {
        $slug = strtolower(trim((string) $this->argument('slug')));
        $tenant = Tenant::query()->where('slug', $slug)->first();

        if ($tenant === null) {
            $this->error("No existe el taller «{$slug}».");

            return self::FAILURE;
        }

        $tenant->forceFill([
            'onboarding_completado' => false,
            'onboarding_paso' => 0,
        ])->save();

        $this->info("Onboarding de {$slug} reiniciado (paso 0).");

        return self::SUCCESS;
    }
}
