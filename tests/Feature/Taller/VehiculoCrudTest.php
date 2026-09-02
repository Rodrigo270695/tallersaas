<?php

declare(strict_types=1);

use App\Models\Cliente;
use App\Models\Vehiculo;
use App\Tenancy\Facades\Tenant as TenantContext;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('El CRUD de vehículos vive en el schema del tenant (requiere PostgreSQL).');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('lista los vehículos del tenant junto al catálogo de clientes', function (): void {
    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        Vehiculo::factory()->count(2)->create();
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->get('http://'.$this->testTenantHost.'/taller/vehiculos');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('taller/vehiculos/index')
        ->has('vehiculos.data', 2)
        ->has('clientes')
    );
});

it('crea un vehículo asociado a un cliente existente', function (): void {
    $clienteId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$clienteId): void {
        $clienteId = Cliente::factory()->create()->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/vehiculos', [
        'cliente_id' => $clienteId,
        'placa' => 'ABC-123',
        'marca' => 'Toyota',
        'modelo' => 'Hilux',
        'color' => 'Blanco',
        'anio' => 2020,
        'kilometraje' => 45000,
        'vin' => '1HGCM82633A004352',
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($clienteId): void {
        expect(Vehiculo::query()->where('placa', 'ABC-123')->where('cliente_id', $clienteId)->exists())->toBeTrue();
    });
});

it('valida que la placa y el cliente sean requeridos', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/vehiculos', [
        'placa' => '',
    ]);

    $response->assertSessionHasErrors(['cliente_id', 'placa']);
});

it('rechaza una placa duplicada en el mismo tenant', function (): void {
    $clienteId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$clienteId): void {
        $clienteId = Cliente::factory()->create()->id;
        Vehiculo::factory()->create(['cliente_id' => $clienteId, 'placa' => 'ABC-123']);
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/vehiculos', [
        'cliente_id' => $clienteId,
        'placa' => 'abc-123',
    ]);

    $response->assertSessionHasErrors(['placa']);
});

it('actualiza un vehículo existente', function (): void {
    $vehiculoId = null;
    $clienteId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$vehiculoId): void {
        $vehiculo = Vehiculo::factory()->create(['kilometraje' => 1000]);
        $vehiculoId = $vehiculo->id;
    });

    $this->actingAs($this->testTenantAdmin);

    TenantContext::runForSlug($this->testTenantSlug, function () use ($vehiculoId, &$clienteId): void {
        $clienteId = Vehiculo::query()->find($vehiculoId)->cliente_id;
    });

    $response = $this->put('http://'.$this->testTenantHost.'/taller/vehiculos/'.$vehiculoId, [
        'cliente_id' => $clienteId,
        'placa' => 'XYZ-999',
        'kilometraje' => 50000,
    ]);

    $response->assertSessionHasNoErrors();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($vehiculoId): void {
        expect(Vehiculo::query()->find($vehiculoId)->kilometraje)->toBe(50000);
    });
});

it('elimina (soft delete) un vehículo', function (): void {
    $vehiculoId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$vehiculoId): void {
        $vehiculoId = Vehiculo::factory()->create()->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->delete('http://'.$this->testTenantHost.'/taller/vehiculos/'.$vehiculoId);

    $response->assertSessionHasNoErrors();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($vehiculoId): void {
        expect(Vehiculo::query()->find($vehiculoId))->toBeNull();
        expect(Vehiculo::withTrashed()->find($vehiculoId))->not->toBeNull();
    });
});

it('elimina varios vehículos en bloque', function (): void {
    $ids = [];

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$ids): void {
        $ids = Vehiculo::factory()->count(2)->create()->pluck('id')->all();
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->delete('http://'.$this->testTenantHost.'/taller/vehiculos-bulk', [
        'ids' => $ids,
    ]);

    $response->assertSessionHasNoErrors();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($ids): void {
        expect(Vehiculo::query()->whereIn('id', $ids)->count())->toBe(0);
    });
});
