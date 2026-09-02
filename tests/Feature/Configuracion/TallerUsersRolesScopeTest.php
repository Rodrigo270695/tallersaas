<?php

declare(strict_types=1);

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Tenancy\TallerAdminScope;
use Database\Seeders\SuperadminSeeder;
use Database\Seeders\TenantRolesSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('Alcance usuarios/roles tenant requiere PostgreSQL.');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();

    config([
        'platform.superadmin.email' => 'superadmin-seed@tallersaas.test',
        'platform.superadmin.password' => 'password',
        'platform.superadmin.name' => 'Super Administrador',
    ]);
    $this->seed(SuperadminSeeder::class);

    $this->createTestTenantWithSchema();

    $this->centralSuperadmin = User::query()
        ->where('email', 'superadmin-seed@tallersaas.test')
        ->firstOrFail();
});

afterEach(function (): void {
    if (isset($this->otherTenant)) {
        User::query()->where('tenant_id', $this->otherTenant->id)->forceDelete();
        $this->otherTenant->forceDelete();
    }

    $this->tearDownTestTenant();
});

it('no lista superadmin ni usuarios de otros talleres en el subdominio del tenant', function (): void {
    $this->otherTenant = Tenant::query()->create([
        'slug' => 'otra-'.Str::lower(Str::random(4)),
        'schema_name' => 'taller_otra_'.Str::lower(Str::random(4)),
        'razon_social' => 'Otro taller',
        'nombre_comercial' => 'Otro',
        'email_admin' => 'otra@test.local',
        'timezone' => 'America/Lima',
        'locale' => 'es',
        'estado' => 'active',
    ]);

    $otherTenantAdmin = User::factory()->create([
        'email' => 'otra-taller-'.Str::random(4).'@test.local',
        'tenant_id' => $this->otherTenant->id,
        'password' => Hash::make('password'),
        'is_active' => true,
        'email_verified_at' => now(),
    ]);
    (new TenantRolesSeeder)->seedForTenant((string) $this->otherTenant->id);
    $prevTeam = getPermissionsTeamId();
    setPermissionsTeamId((string) $this->otherTenant->id);
    try {
        $otherTenantAdmin->assignRole('admin_taller');
    } finally {
        setPermissionsTeamId($prevTeam);
    }

    $this->actingAs($this->testTenantAdmin);

    $response = $this->get('http://'.$this->testTenantHost.'/configuracion/usuarios');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('configuracion/usuarios/index')
        ->has('users.data', 1)
        ->where('users.data.0.email', $this->testTenantAdmin->email)
    );
});

it('no muestra el rol superadmin en el catálogo de roles del tenant', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->get('http://'.$this->testTenantHost.'/configuracion/roles');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('configuracion/roles/index')
        ->where('roles.data', function ($roles): bool {
            $names = collect($roles)->pluck('name')->all();

            return ! in_array('superadmin', $names, true);
        })
    );
});

it('rechaza asignar rol superadmin al crear usuario en taller', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/configuracion/usuarios', [
        'name' => 'Intento Super',
        'email' => 'intento-super-'.Str::random(4).'@test.local',
        'password' => 'Password1!',
        'password_confirmation' => 'Password1!',
        'is_active' => true,
        'role' => 'superadmin',
    ]);

    $response->assertSessionHasErrors('role');
});

it('filtra permisos de plataforma del catálogo de roles en taller', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->get('http://'.$this->testTenantHost.'/configuracion/roles');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('permissions_catalog', function ($catalog): bool {
            $allNames = collect($catalog)
                ->flatMap(fn ($g) => collect($g['permissions'])->pluck('name'))
                ->all();

            foreach ($allNames as $name) {
                if (! TallerAdminScope::isTenantAssignablePermission($name)) {
                    return false;
                }
            }

            $forbidden = [
                'plataforma-tenants.view',
                'platform-settings.view',
                'audit-trail.view',
            ];

            foreach ($forbidden as $name) {
                if (in_array($name, $allNames, true)) {
                    return false;
                }
            }

            return count($allNames) > 0;
        })
    );
});

it('marca admin_taller como rol protegido y lo mantiene visible en taller', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->get('http://'.$this->testTenantHost.'/configuracion/roles');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('roles.data', function ($roles): bool {
            $admin = collect($roles)->firstWhere('name', 'admin_taller');

            return $admin !== null && ($admin['is_system'] ?? false) === true;
        })
    );
});

it('rechaza eliminar un rol base de taller', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $role = Role::query()
        ->where('tenant_id', $this->testTenant->id)
        ->where('name', 'admin_taller')
        ->firstOrFail();

    $response = $this->delete('http://'.$this->testTenantHost.'/configuracion/roles/'.$role->id);

    $response->assertSessionHasErrors('name');
    expect(Role::query()->whereKey($role->id)->exists())->toBeTrue();
});

it('rechaza vaciar permisos de un rol base de taller', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $role = Role::query()
        ->where('tenant_id', $this->testTenant->id)
        ->where('name', 'admin_taller')
        ->firstOrFail();
    expect($role->permissions()->count())->toBeGreaterThan(0);

    $response = $this->put(
        'http://'.$this->testTenantHost.'/configuracion/roles/'.$role->id.'/permissions',
        ['permissions' => []],
    );

    $response->assertSessionHasErrors('permissions');
    expect($role->fresh()->permissions()->count())->toBeGreaterThan(0);
});

it('omite roles base al intentar borrado masivo', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $custom = Role::query()->create([
        'name' => 'custom_scope_'.Str::lower(Str::random(4)),
        'guard_name' => 'web',
        'description' => 'Temporal',
        'tenant_id' => $this->testTenant->id,
    ]);
    $admin = Role::query()
        ->where('tenant_id', $this->testTenant->id)
        ->where('name', 'admin_taller')
        ->firstOrFail();

    $response = $this->delete('http://'.$this->testTenantHost.'/configuracion/roles/bulk', [
        'ids' => [$custom->id, $admin->id],
    ]);

    $response->assertRedirect();
    expect(Role::query()->whereKey($custom->id)->exists())->toBeFalse();
    expect(Role::query()->whereKey($admin->id)->exists())->toBeTrue();
});

it('mantiene en el catálogo un permiso quitado de admin_taller para poder reasignarlo', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $role = Role::query()
        ->where('tenant_id', $this->testTenant->id)
        ->where('name', 'admin_taller')
        ->firstOrFail();

    $removed = 'clientes.export';
    expect($role->hasPermissionTo($removed))->toBeTrue();

    $keep = $role->permissions()
        ->pluck('name')
        ->reject(fn (string $name): bool => $name === $removed)
        ->values()
        ->all();

    $this->put(
        'http://'.$this->testTenantHost.'/configuracion/roles/'.$role->id.'/permissions',
        ['permissions' => $keep],
    )->assertRedirect();

    expect($role->fresh()->hasPermissionTo($removed))->toBeFalse();

    $index = $this->get('http://'.$this->testTenantHost.'/configuracion/roles');
    $index->assertOk();
    $index->assertInertia(fn ($page) => $page
        ->where('permissions_catalog', function ($catalog) use ($removed): bool {
            $allNames = collect($catalog)
                ->flatMap(fn ($g) => collect($g['permissions'])->pluck('name'))
                ->all();

            return in_array($removed, $allNames, true);
        })
    );

    $this->put(
        'http://'.$this->testTenantHost.'/configuracion/roles/'.$role->id.'/permissions',
        ['permissions' => [...$keep, $removed]],
    )->assertRedirect();

    expect($role->fresh()->hasPermissionTo($removed))->toBeTrue();
});

it('lista solo roles de plataforma en el host central', function (): void {
    $this->actingAs($this->centralSuperadmin);

    $response = $this->get('http://localhost/configuracion/roles');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('configuracion/roles/index')
        ->where('roles.data', function ($roles): bool {
            $names = collect($roles)->pluck('name')->all();

            return in_array('superadmin', $names, true)
                && ! in_array('admin_taller', $names, true);
        })
    );
});

it('crea un rol personalizado y un usuario con ese rol', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $roleName = 'jefe_patio_'.Str::lower(Str::random(4));

    $this->post('http://'.$this->testTenantHost.'/configuracion/roles', [
        'name' => $roleName,
        'description' => 'Rol custom de prueba',
    ])->assertSessionHasNoErrors()->assertRedirect();

    $role = Role::query()
        ->where('tenant_id', $this->testTenant->id)
        ->where('name', $roleName)
        ->firstOrFail();

    $this->put(
        'http://'.$this->testTenantHost.'/configuracion/roles/'.$role->id.'/permissions',
        ['permissions' => ['dashboard.view', 'clientes.view']],
    )->assertSessionHasNoErrors()->assertRedirect();

    $email = 'custom-'.Str::lower(Str::random(4)).'@test.local';

    $this->post('http://'.$this->testTenantHost.'/configuracion/usuarios', [
        'name' => 'Usuario Custom',
        'email' => $email,
        'password' => 'Password1!',
        'password_confirmation' => 'Password1!',
        'is_active' => true,
        'role' => $roleName,
    ])->assertSessionHasNoErrors()->assertRedirect();

    $created = User::query()->where('email', $email)->firstOrFail();
    expect($created->tenant_id)->toBe($this->testTenant->id);

    $prev = getPermissionsTeamId();
    setPermissionsTeamId((string) $this->testTenant->id);
    try {
        expect($created->hasRole($roleName))->toBeTrue();
    } finally {
        setPermissionsTeamId($prev);
    }
});
