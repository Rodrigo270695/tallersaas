<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\PermissionsSeeder;
use Database\Seeders\SuperadminSeeder;
use Database\Seeders\TenantRolesSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Arranque mínimo de un tenant (taller) con schema migrado para tests Feature en PostgreSQL.
 */
trait CreatesTestTenant
{
    protected Tenant $testTenant;

    protected string $testTenantSlug;

    protected string $testTenantSchema;

    protected string $testTenantHost;

    protected User $testTenantAdmin;

    protected function configureTenancyForTests(): void
    {
        config([
            'tenant.central_domains' => ['localhost', '127.0.0.1', 'tallersaas.test'],
            'tenant.root_domain' => 'tallersaas.test',
            'tenant.schema_prefix' => 'taller_',
            'tenant.allowed_states' => ['active', 'trial', 'grace'],
            'tenant.cache_ttl' => 0,
            'app.url' => 'http://127.0.0.1:8000',
        ]);
    }

    protected function createTestTenantWithSchema(): void
    {
        $this->testTenantSlug = 't-'.Str::lower(Str::random(6));
        $this->testTenantSchema = 'taller_test_'.Str::lower(Str::random(6));
        $this->testTenantHost = $this->testTenantSlug.'.tallersaas.test';

        Artisan::call('tallersaas:tenant-migrate', [
            'schema' => $this->testTenantSchema,
        ]);

        $this->testTenant = Tenant::query()->create([
            'slug' => $this->testTenantSlug,
            'schema_name' => $this->testTenantSchema,
            'razon_social' => 'Taller Test S.A.C.',
            'nombre_comercial' => 'Taller Test',
            'email_admin' => 'admin-'.$this->testTenantSlug.'@test.local',
            'timezone' => 'America/Lima',
            'locale' => 'es',
            'estado' => 'active',
        ]);

        (new TenantRolesSeeder)->seedForTenant((string) $this->testTenant->id);

        $previousTeam = getPermissionsTeamId();
        setPermissionsTeamId((string) $this->testTenant->id);

        try {
            $this->testTenantAdmin = User::factory()->create([
                'email' => 'admin-'.$this->testTenantSlug.'@test.local',
                'tenant_id' => $this->testTenant->id,
                'password' => Hash::make('password'),
                'is_active' => true,
                'must_change_password' => false,
                'email_verified_at' => now(),
            ]);
            $this->testTenantAdmin->assignRole('admin_taller');
        } finally {
            setPermissionsTeamId($previousTeam);
        }
    }

    protected function seedPermissionsAndRoles(): void
    {
        $this->seed(PermissionsSeeder::class);
        // Los roles de taller se siembran por tenant en createTestTenantWithSchema().
    }

    protected function tearDownTestTenant(): void
    {
        if (! isset($this->testTenant)) {
            return;
        }

        if (isset($this->testTenantSchema)) {
            DB::statement('DROP SCHEMA IF EXISTS "'.$this->testTenantSchema.'" CASCADE');
        }

        // El schema del tenant ya no referencia `public.sedes`; ahora sí
        // se puede borrar el tenant (cascade a sedes) sin RESTRICT.
        User::query()->where('tenant_id', $this->testTenant->id)->forceDelete();

        $this->testTenant->forceDelete();

        DB::statement('SET search_path TO public');
    }

    protected function createTestSuperadmin(): User
    {
        config([
            'platform.superadmin.email' => 'superadmin-'.Str::random(6).'@test.local',
            'platform.superadmin.password' => 'password',
            'platform.superadmin.name' => 'Super Test',
        ]);

        $this->seed(SuperadminSeeder::class);

        return User::query()->where('email', config('platform.superadmin.email'))->firstOrFail();
    }
}
