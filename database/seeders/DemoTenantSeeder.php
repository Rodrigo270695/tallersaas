<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Services\Tenancy\TenantProvisioner;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Crea un tenant de demostración accesible en
 * `https://{slug}.{TENANT_ROOT_DOMAIN}` (por defecto `demo.tallersaas.orvae.pe`),
 * usando el mismo {@see TenantProvisioner} que el endpoint de aprovisionamiento
 * de Orvae: registro en `public.tenants`, schema PostgreSQL, migraciones
 * tenant, roles base y usuario admin.
 *
 * Idempotente: si el slug ya existe, no hace nada (no se puede "reprovisionar").
 *
 * No está registrado en {@see DatabaseSeeder} a propósito, para no crear el
 * tenant demo en cada deploy. Ejecutar manualmente cuando se necesite:
 *
 *     php artisan db:seed --class=DemoTenantSeeder --force
 */
class DemoTenantSeeder extends Seeder
{
    public function run(TenantProvisioner $provisioner): void
    {
        $slug = (string) config('platform.demo_tenant.slug', 'demo');

        $existing = Tenant::query()->where('slug', $slug)->first();

        if ($existing !== null) {
            $this->command?->warn("DemoTenantSeeder omitido: ya existe un tenant con slug \"{$slug}\" (id: {$existing->id}).");

            return;
        }

        $adminEmail = (string) config('platform.demo_tenant.admin_email', 'admin@demo.orvae.pe');
        $adminPassword = config('platform.demo_tenant.admin_password');
        $isGeneratedPassword = $adminPassword === null || $adminPassword === '';
        $adminPassword = $isGeneratedPassword ? Str::password(length: 16, symbols: false) : (string) $adminPassword;

        $tenant = $provisioner->provision([
            'plan_slug' => (string) config('platform.demo_tenant.plan', 'pro'),
            'tenant_slug' => $slug,
            'razon_social' => (string) config('platform.demo_tenant.razon_social', 'Taller Demo S.A.C.'),
            'nombre_comercial' => config('platform.demo_tenant.nombre_comercial', 'Taller Demo'),
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
        $this->command?->line('  · Admin email: '.$adminEmail);

        if ($isGeneratedPassword) {
            $this->command?->warn('  · Admin password (generada, guárdala): '.$adminPassword);
        } else {
            $this->command?->line('  · Admin password: '.$adminPassword);
        }
    }
}
