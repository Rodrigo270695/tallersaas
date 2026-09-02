<?php

namespace App\Console\Commands;

use App\Models\Plan;
use App\Services\Tenancy\TenantProvisioner;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use RuntimeException;

/**
 * Crea un tenant completo para desarrollo local: registro en
 * `public.tenants`, schema PostgreSQL, migraciones tenant, roles y el
 * primer usuario admin. Usa el mismo {@see TenantProvisioner} que el
 * endpoint de aprovisionamiento de Orvae.
 */
class TenantCreateCommand extends Command
{
    protected $signature = 'tallersaas:tenant-create
                            {slug : Slug del tenant / subdominio (ej. taller-rivera)}
                            {--plan=basico : Código del plan (free, basico, pro)}
                            {--razon-social= : Razón social del taller}
                            {--nombre-comercial= : Nombre comercial (opcional)}
                            {--ruc= : RUC de 11 dígitos (opcional)}
                            {--telefono= : Teléfono de contacto (opcional)}
                            {--admin-nombres=Admin : Nombres del usuario admin}
                            {--admin-apellidos=Taller : Apellidos del usuario admin}
                            {--admin-email= : Email del usuario admin}
                            {--admin-password= : Contraseña del admin. Si se omite, se genera una aleatoria}';

    protected $description = 'Crea un tenant de prueba (schema + admin) para desarrollo local.';

    public function handle(TenantProvisioner $provisioner): int
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->error('Solo está soportado PostgreSQL para multi-schema tenant.');

            return self::FAILURE;
        }

        $slug = (string) $this->argument('slug');
        $planCodigo = (string) $this->option('plan');
        $adminEmail = $this->option('admin-email') ?: "admin@{$slug}.test";
        $isGeneratedPassword = $this->option('admin-password') === null;
        $adminPassword = $this->option('admin-password') ?: str()->password(length: 16, symbols: false);

        try {
            $payload = validator([
                'plan_slug' => $planCodigo,
                'tenant_slug' => $slug,
                'razon_social' => $this->option('razon-social') ?: ucwords(str_replace('-', ' ', $slug)),
                'nombre_comercial' => $this->option('nombre-comercial'),
                'ruc' => $this->option('ruc'),
                'telefono' => $this->option('telefono'),
                'admin_nombres' => $this->option('admin-nombres'),
                'admin_apellidos' => $this->option('admin-apellidos'),
                'admin_email' => $adminEmail,
                'admin_password' => $adminPassword,
            ], [
                'plan_slug' => ['required', 'string'],
                'tenant_slug' => ['required', 'string', 'regex:/^[a-z0-9\-]{3,60}$/'],
                'razon_social' => ['required', 'string', 'max:200'],
                'nombre_comercial' => ['nullable', 'string', 'max:150'],
                'ruc' => ['nullable', 'regex:/^\d{11}$/'],
                'telefono' => ['nullable', 'string', 'max:20'],
                'admin_nombres' => ['required', 'string', 'max:100'],
                'admin_apellidos' => ['required', 'string', 'max:100'],
                'admin_email' => ['required', 'email', 'max:150'],
                'admin_password' => ['required', 'string', 'min:8', 'max:200'],
            ])->validate();
        } catch (ValidationException $e) {
            foreach ($e->errors() as $field => $messages) {
                foreach ($messages as $msg) {
                    $this->error("[$field] $msg");
                }
            }

            return self::FAILURE;
        }

        if (Plan::query()->where('codigo', $planCodigo)->where('activo', true)->doesntExist()) {
            $this->error("Plan inexistente o inactivo: \"$planCodigo\". Corre `php artisan db:seed --class=PlansAndFeaturesSeeder`.");

            return self::FAILURE;
        }

        try {
            $tenant = $provisioner->provision($payload);
        } catch (InvalidArgumentException|RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info('Tenant creado correctamente.');
        $this->line('  · Slug: '.$tenant->slug);
        $this->line('  · Schema: '.$tenant->schema_name);
        $this->line('  · Plan: '.$planCodigo.' ('.$tenant->estado.')');
        $this->line('  · URL de login: '.$provisioner->buildLoginUrl($tenant));
        $this->line('  · Admin email: '.$adminEmail);

        if ($isGeneratedPassword) {
            $this->warn('  · Admin password (generado): '.$adminPassword);
        } else {
            $this->line('  · Admin password: '.$adminPassword);
        }

        return self::SUCCESS;
    }
}
