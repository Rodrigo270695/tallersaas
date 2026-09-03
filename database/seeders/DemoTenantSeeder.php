<?php

namespace Database\Seeders;

use App\Console\Commands\ResetDemoCommand;
use App\Models\Tenant;
use App\Services\Tenancy\TenantProvisioner;
use Illuminate\Database\Seeder;

/**
 * Crea una sola vez el tenant slug `demo`.
 *
 * Credenciales fijas (sin .env): demo@tallersaas.pe / demo1234
 *
 *     php artisan db:seed --class=DemoTenantSeeder --force
 *     php artisan tallersaas:reset-demo
 *
 * El VPS debe tener cron:
 *     * * * * * cd /var/www/tallersaas && php artisan schedule:run
 * que a las 02:00 ejecuta tallersaas:reset-demo (migra schema demo + reseedea).
 */
class DemoTenantSeeder extends Seeder
{
    public function run(TenantProvisioner $provisioner): void
    {
        $slug = ResetDemoCommand::DEMO_SLUG;

        $existing = Tenant::query()->where('slug', $slug)->first();

        if ($existing !== null) {
            $this->command?->warn("DemoTenantSeeder omitido: ya existe un tenant con slug \"{$slug}\" (id: {$existing->id}).");

            return;
        }

        $adminEmail = ResetDemoCommand::DEMO_EMAIL;
        $adminPassword = ResetDemoCommand::DEMO_PASSWORD;

        $tenant = $provisioner->provision([
            'plan_slug' => ResetDemoCommand::DEMO_PLAN,
            'tenant_slug' => $slug,
            'razon_social' => 'Taller Demo S.A.C.',
            'nombre_comercial' => 'Taller Demo',
            'admin_nombres' => 'Admin',
            'admin_apellidos' => 'Demo',
            'admin_email' => $adminEmail,
            'admin_password' => $adminPassword,
            'canal_adquisicion' => 'seeder-demo',
        ]);

        $this->command?->info('Tenant demo creado correctamente.');
        $this->command?->line('  · Slug: '.$tenant->slug);
        $this->command?->line('  · Schema: '.$tenant->schema_name);
        $this->command?->line('  · URL de login: '.$provisioner->buildLoginUrl($tenant));
        $this->command?->line('  · Admin: '.$adminEmail.' / '.$adminPassword);
        $this->command?->line('  · Luego ejecuta: php artisan tallersaas:reset-demo');
    }
}
