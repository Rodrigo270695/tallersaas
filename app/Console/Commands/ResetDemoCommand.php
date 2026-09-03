<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Sede;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantSchemaMigrator;
use Database\Seeders\DemoDataSeeder;
use Database\Seeders\PermissionsSeeder;
use Database\Seeders\TenantRolesSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\PermissionRegistrar;

/**
 * Resetea SOLO el tenant público `demo`:
 *   1) aplica migraciones pendientes de su schema
 *   2) restaura roles/admin
 *   3) deja la sede «Sede prueba» (Chiclayo / Lambayeque)
 *   4) vuelve a sembrar datos de demo
 *
 * Scheduler (cron del VPS → `schedule:run`):
 *   tallersaas:reset-demo  @ 02:00
 *
 * No lee .env ni toca otros talleres.
 */
final class ResetDemoCommand extends Command
{
    public const DEMO_SLUG = 'demo';

    public const DEMO_PLAN = 'pro';

    public const DEMO_EMAIL = 'demo@tallersaas.pe';

    public const DEMO_PASSWORD = 'demo1234';

    public const DEMO_SEDE_CODIGO = 'CHI-01';

    public const DEMO_SEDE_NOMBRE = 'Sede prueba';

    protected $signature = 'tallersaas:reset-demo';

    protected $description = 'Migra el schema demo + resetea datos/sede/roles (noche 02:00 vía cron)';

    public function handle(TenantSchemaMigrator $migrator): int
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->error('Este comando requiere PostgreSQL.');

            return self::FAILURE;
        }

        $this->info('── Reset demo ─────────────────────────────────');

        $tenant = Tenant::query()->where('slug', self::DEMO_SLUG)->first();

        if ($tenant === null) {
            $this->error('Tenant "demo" no encontrado en public.tenants.');
            $this->line('Crea el demo una sola vez: php artisan db:seed --class=DemoTenantSeeder --force');

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

        $this->line("  → Migrando schema {$schema} (solo demo)…");
        $code = $migrator->migrate($schema, $this->output, false, false);
        if ($code !== TenantSchemaMigrator::EXIT_SUCCESS) {
            $this->error("Falló la migración del schema {$schema}.");

            return self::FAILURE;
        }

        $this->resyncRbac($tenant);
        $this->restoreDemoAdmin($tenant);

        // Vaciar tablas tenant que apuntan a sedes (ON DELETE RESTRICT)
        // antes de borrar sedes que no sean CHI-01.
        $this->line('  → Limpiando datos operativos del schema demo…');
        DemoDataSeeder::wipeOperationalTables($schema);

        $this->ensureDemoSede($tenant);

        $this->line('  → Recargando datos operativos del demo…');
        $seeder = new DemoDataSeeder;
        $seeder->setCommand($this);
        $seeder->run();

        $root = (string) config('tenant.root_domain', 'tallersaas.orvae.pe');
        $this->info('✓ Demo listo — https://'.self::DEMO_SLUG.".{$root}/login");
        $this->line('  '.self::DEMO_EMAIL.' / '.self::DEMO_PASSWORD);

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
        $roles->seedForTenant((string) $tenant->id, true);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->line('  → Caché de permisos Spatie limpiada.');
    }

    private function restoreDemoAdmin(Tenant $tenant): void
    {
        $previousTeam = getPermissionsTeamId();
        setPermissionsTeamId((string) $tenant->id);

        try {
            $user = User::query()
                ->where('tenant_id', $tenant->id)
                ->where('email', self::DEMO_EMAIL)
                ->first();

            if ($user !== null) {
                $user->password = Hash::make(self::DEMO_PASSWORD);
                $user->must_change_password = false;
                $user->is_active = true;
                $user->save();
                $user->syncRoles(['admin_taller']);
                $user->forgetCachedPermissions();
                $this->line('  → Usuario '.self::DEMO_EMAIL.': clave restaurada + rol admin_taller.');

                return;
            }

            $this->warn('  ⚠ Usuario '.self::DEMO_EMAIL.' no encontrado — recreando…');
            $user = User::query()->create([
                'tenant_id' => $tenant->id,
                'email' => self::DEMO_EMAIL,
                'name' => 'Admin Demo',
                'password' => Hash::make(self::DEMO_PASSWORD),
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
        Sede::withTrashed()
            ->where('tenant_id', $tenant->id)
            ->where('codigo', '!=', self::DEMO_SEDE_CODIGO)
            ->forceDelete();

        Sede::withTrashed()->updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'codigo' => self::DEMO_SEDE_CODIGO,
            ],
            [
                'nombre' => self::DEMO_SEDE_NOMBRE,
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

        $this->line('  → Sede '.self::DEMO_SEDE_CODIGO.' ('.self::DEMO_SEDE_NOMBRE.', Chiclayo / Lambayeque) asegurada.');
    }
}
