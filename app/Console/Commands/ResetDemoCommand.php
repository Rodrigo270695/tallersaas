<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Sede;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\DemoDataSeeder;
use Database\Seeders\PermissionsSeeder;
use Database\Seeders\TenantRolesSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\PermissionRegistrar;

/**
 * Resetea el tenant slug `demo` (datos + contraseña + sede prueba).
 *
 * Uso normal (scheduler 02:00):
 *   php artisan tallersaas:reset-demo
 *
 * No toca otros talleres.
 */
final class ResetDemoCommand extends Command
{
    protected $signature = 'tallersaas:reset-demo';

    protected $description = 'Resetea datos y contraseña del tenant demo (corre automáticamente cada noche a las 02:00)';

    public function handle(): int
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->error('Este comando requiere PostgreSQL.');

            return self::FAILURE;
        }

        $slug = (string) config('platform.demo_tenant.slug', 'demo');
        $adminEmail = (string) config('platform.demo_tenant.admin_email', 'admin@demo.orvae.pe');
        $adminPassword = (string) config('platform.demo_tenant.admin_password', 'demo1234');

        $this->info('── Reset demo ─────────────────────────────────');

        $tenant = Tenant::query()->where('slug', $slug)->first();

        if ($tenant === null) {
            $this->error("Tenant \"{$slug}\" no encontrado en public.tenants.");
            $this->line('Crea el demo con: php artisan db:seed --class=DemoTenantSeeder --force');

            return self::FAILURE;
        }

        $schema = (string) $tenant->schema_name;
        $exists = (bool) DB::selectOne(
            'select exists(select 1 from information_schema.schemata where schema_name = ?) as ok',
            [$schema],
        )?->ok;

        if (! $exists) {
            $this->error("El schema {$schema} no existe. Reprovisiona el tenant demo.");

            return self::FAILURE;
        }

        $this->resyncRbac($tenant);
        $this->restoreDemoAdmin($tenant, $adminEmail, $adminPassword);
        $this->ensureDemoSede($tenant);

        $this->line('  → Recargando datos operativos del demo…');
        $seeder = new DemoDataSeeder;
        $seeder->setCommand($this);
        $seeder->run();

        $root = (string) config('tenant.root_domain', 'tallersaas.orvae.pe');
        $this->info("✓ Demo listo — https://{$slug}.{$root}/login");
        $this->line("  {$adminEmail} / {$adminPassword}");

        return self::SUCCESS;
    }

    private function resyncRbac(Tenant $tenant): void
    {
        $this->line('  → Re-sincronizando permisos y roles base del demo…');

        $perms = new PermissionsSeeder;
        $perms->setCommand($this);
        $perms->run();

        $roles = new TenantRolesSeeder;
        $roles->setCommand($this);
        // forceSync: restaura admin_taller y roles base si alguien los vació.
        $roles->seedForTenant((string) $tenant->id, true);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->line('  → Caché de permisos Spatie limpiada.');
    }

    private function restoreDemoAdmin(Tenant $tenant, string $email, string $password): void
    {
        $previousTeam = getPermissionsTeamId();
        setPermissionsTeamId((string) $tenant->id);

        try {
            $user = User::query()
                ->where('tenant_id', $tenant->id)
                ->where('email', $email)
                ->first();

            if ($user !== null) {
                $user->password = Hash::make($password);
                $user->must_change_password = false;
                $user->is_active = true;
                $user->save();
                $user->syncRoles(['admin_taller']);
                $user->forgetCachedPermissions();
                $this->line("  → Usuario {$email}: clave restaurada + rol admin_taller.");

                return;
            }

            $this->warn("  ⚠ Usuario {$email} no encontrado — recreando…");
            $user = User::query()->create([
                'tenant_id' => $tenant->id,
                'email' => $email,
                'name' => 'Admin Demo',
                'password' => Hash::make($password),
                'is_active' => true,
                'must_change_password' => false,
                'email_verified_at' => now(),
            ]);
            $user->syncRoles(['admin_taller']);
            $user->forgetCachedPermissions();
        } finally {
            setPermissionsTeamId($previousTeam);
        }
    }

    private function ensureDemoSede(Tenant $tenant): void
    {
        $codigo = (string) config('platform.demo_tenant.sede_codigo', 'CHI-01');
        $nombre = (string) config('platform.demo_tenant.sede_nombre', 'Sede prueba');

        // Deja solo la sede de demo (borra las que crearon los visitantes).
        Sede::withTrashed()
            ->where('tenant_id', $tenant->id)
            ->where('codigo', '!=', $codigo)
            ->forceDelete();

        Sede::withTrashed()->updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'codigo' => $codigo,
            ],
            [
                'nombre' => $nombre,
                'direccion' => 'Av. Balta 1234',
                'distrito' => 'Chiclayo',
                'provincia' => 'Chiclayo',
                'departamento' => 'Lambayeque',
                'telefono' => '+51 74 555-0101',
                'email' => 'sede@demo.orvae.pe',
                'serie_factura' => 'F001',
                'serie_boleta' => 'B001',
                'activa' => true,
                'deleted_at' => null,
            ],
        );

        $this->line("  → Sede {$codigo} ({$nombre}, Chiclayo / Lambayeque) asegurada.");
    }
}
