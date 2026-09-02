<?php

declare(strict_types=1);

use App\Models\Marca;
use App\Models\Modelo;
use App\Models\Tenant;
use App\Tenancy\Facades\Tenant as TenantContext;
use Database\Seeders\TenantRolesSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('El catálogo de marca/modelo vive en el schema del tenant (requiere PostgreSQL).');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('crea una marca nueva y la guarda en mayúsculas', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/marcas', [
        'nombre' => 'toyota',
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        expect(Marca::query()->where('nombre', 'TOYOTA')->exists())->toBeTrue();
    });
});

it('rechaza una marca duplicada (sin importar mayúsculas/minúsculas)', function (): void {
    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        Marca::factory()->create(['nombre' => 'Toyota']);
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/marcas', [
        'nombre' => 'toyota',
    ]);

    $response->assertSessionHasErrors(['nombre']);
});

it('crea un modelo ligado a una marca y lo guarda en mayúsculas', function (): void {
    $marcaId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$marcaId): void {
        $marcaId = Marca::factory()->create(['nombre' => 'Toyota'])->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/modelos', [
        'marca_id' => $marcaId,
        'nombre' => 'hilux',
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($marcaId): void {
        expect(Modelo::query()->where('marca_id', $marcaId)->where('nombre', 'HILUX')->exists())->toBeTrue();
    });
});

it('rechaza crear un modelo sin indicar la marca', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/modelos', [
        'nombre' => 'hilux',
    ]);

    $response->assertSessionHasErrors(['marca_id']);
});

it('rechaza un modelo duplicado para la misma marca', function (): void {
    $marcaId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$marcaId): void {
        $marcaId = Marca::factory()->create(['nombre' => 'Toyota'])->id;
        Modelo::factory()->create(['marca_id' => $marcaId, 'nombre' => 'Hilux']);
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/modelos', [
        'marca_id' => $marcaId,
        'nombre' => 'HILUX',
    ]);

    $response->assertSessionHasErrors(['nombre']);
});

it('permite el mismo nombre de modelo en marcas distintas', function (): void {
    $marcaAId = null;
    $marcaBId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$marcaAId, &$marcaBId): void {
        $marcaAId = Marca::factory()->create(['nombre' => 'Toyota'])->id;
        $marcaBId = Marca::factory()->create(['nombre' => 'Kia'])->id;
        Modelo::factory()->create(['marca_id' => $marcaAId, 'nombre' => 'RIO']);
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/modelos', [
        'marca_id' => $marcaBId,
        'nombre' => 'rio',
    ]);

    $response->assertSessionHasNoErrors();
});

it('una marca creada por un taller no es visible para otro taller', function (): void {
    $otroSlug = 't-'.Str::lower(Str::random(6));
    $otroSchema = 'taller_test_'.Str::lower(Str::random(6));

    Artisan::call('tallersaas:tenant-migrate', ['schema' => $otroSchema]);

    $otroTenant = Tenant::query()->create([
        'slug' => $otroSlug,
        'schema_name' => $otroSchema,
        'razon_social' => 'Otro Taller S.A.C.',
        'nombre_comercial' => 'Otro Taller',
        'email_admin' => 'admin-'.$otroSlug.'@test.local',
        'timezone' => 'America/Lima',
        'locale' => 'es',
        'estado' => 'active',
    ]);

    (new TenantRolesSeeder)->seedForTenant((string) $otroTenant->id);

    try {
        TenantContext::runForSlug($this->testTenantSlug, function (): void {
            Marca::factory()->create(['nombre' => 'Marca Solo De Este Taller']);
        });

        TenantContext::runForSlug($otroSlug, function (): void {
            expect(Marca::query()->where('nombre', 'MARCA SOLO DE ESTE TALLER')->exists())->toBeFalse();
        });

        TenantContext::runForSlug($this->testTenantSlug, function (): void {
            expect(Marca::query()->where('nombre', 'MARCA SOLO DE ESTE TALLER')->exists())->toBeTrue();
        });
    } finally {
        DB::statement('DROP SCHEMA IF EXISTS "'.$otroSchema.'" CASCADE');
        $otroTenant->forceDelete();
        DB::statement('SET search_path TO public');
    }
});
