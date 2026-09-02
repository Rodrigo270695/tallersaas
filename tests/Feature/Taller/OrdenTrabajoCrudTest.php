<?php

declare(strict_types=1);

use App\Models\Cliente;
use App\Models\OrdenTrabajo;
use App\Models\Sede;
use App\Models\Vehiculo;
use App\Tenancy\Facades\Tenant as TenantContext;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;
use Tests\Support\SeedsGeoCatalog;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class, SeedsGeoCatalog::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('El CRUD de órdenes vive en el schema del tenant (requiere PostgreSQL).');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
    $this->seedGeoCatalog();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('lista las órdenes de trabajo del tenant', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede): void {
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        OrdenTrabajo::query()->create([
            'sede_id' => $sede->id,
            'numero' => OrdenTrabajo::generateNextNumber(),
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => OrdenTrabajo::ESTADO_ABIERTA,
            'ingreso_at' => now(),
        ]);
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->get('http://'.$this->testTenantHost.'/taller/ordenes-trabajo');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('taller/ordenes-trabajo/index')
        ->has('ordenes.data', 1)
        ->has('sedes')
        ->has('clientes')
        ->has('vehiculos')
        ->has('taller_nombre')
    );
});

it('crea una orden de trabajo con número correlativo', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $clienteId = null;
    $vehiculoId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$clienteId, &$vehiculoId): void {
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        $clienteId = $cliente->id;
        $vehiculoId = $vehiculo->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/ordenes-trabajo', [
        'sede_id' => $sede->id,
        'cliente_id' => $clienteId,
        'vehiculo_id' => $vehiculoId,
        'solicitud_cliente' => 'Cambio de aceite',
        'km_ingreso' => 45000,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        $orden = OrdenTrabajo::query()->first();
        expect($orden)->not->toBeNull()
            ->and($orden->numero)->toStartWith('OT-'.now()->year.'-')
            ->and($orden->estado)->toBe(OrdenTrabajo::ESTADO_ABIERTA)
            ->and($orden->solicitud_cliente)->toBe('Cambio de aceite');
    });
});

it('exige que el vehículo pertenezca al cliente', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $clienteA = null;
    $vehiculoB = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$clienteA, &$vehiculoB): void {
        $clienteA = Cliente::factory()->create()->id;
        $otro = Cliente::factory()->create();
        $vehiculoB = Vehiculo::factory()->create(['cliente_id' => $otro->id])->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/ordenes-trabajo', [
        'sede_id' => $sede->id,
        'cliente_id' => $clienteA,
        'vehiculo_id' => $vehiculoB,
    ]);

    $response->assertSessionHasErrors(['vehiculo_id']);
});

it('actualiza el estado de una orden a lista', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $ordenId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede, &$ordenId): void {
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        $ordenId = OrdenTrabajo::query()->create([
            'sede_id' => $sede->id,
            'numero' => OrdenTrabajo::generateNextNumber(),
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => OrdenTrabajo::ESTADO_ABIERTA,
            'ingreso_at' => now(),
        ])->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->put('http://'.$this->testTenantHost.'/taller/ordenes-trabajo/'.$ordenId, [
        'sede_id' => $sede->id,
        'cliente_id' => TenantContext::runForSlug($this->testTenantSlug, fn () => OrdenTrabajo::find($ordenId)->cliente_id),
        'vehiculo_id' => TenantContext::runForSlug($this->testTenantSlug, fn () => OrdenTrabajo::find($ordenId)->vehiculo_id),
        'estado' => OrdenTrabajo::ESTADO_LISTA,
    ]);

    $response->assertSessionHasNoErrors();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($ordenId): void {
        $orden = OrdenTrabajo::query()->find($ordenId);
        expect($orden->estado)->toBe(OrdenTrabajo::ESTADO_LISTA)
            ->and($orden->lista_at)->not->toBeNull();
    });
});

it('marca la orden como avisada y guarda el teléfono del cliente', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $ordenId = null;
    $clienteId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede, &$ordenId, &$clienteId): void {
        $cliente = Cliente::factory()->create(['telefono' => null]);
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        $clienteId = $cliente->id;
        $ordenId = OrdenTrabajo::query()->create([
            'sede_id' => $sede->id,
            'numero' => OrdenTrabajo::generateNextNumber(),
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => OrdenTrabajo::ESTADO_LISTA,
            'ingreso_at' => now(),
            'lista_at' => now(),
            'saldo' => 80,
        ])->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->from('http://'.$this->testTenantHost.'/taller/ordenes-trabajo')
        ->post('http://'.$this->testTenantHost.'/taller/ordenes-trabajo/'.$ordenId.'/avisar-lista', [
            'telefono' => '987654321',
            'mensaje' => '',
            'guardar_en_cliente' => true,
        ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($ordenId, $clienteId): void {
        $orden = OrdenTrabajo::query()->find($ordenId);
        $cliente = Cliente::query()->find($clienteId);
        expect($orden->lista_notificada_at)->not->toBeNull()
            ->and($cliente->telefono)->toBe('987654321');
    });
});

it('no permite avisar si la orden no está lista', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $ordenId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede, &$ordenId): void {
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        $ordenId = OrdenTrabajo::query()->create([
            'sede_id' => $sede->id,
            'numero' => OrdenTrabajo::generateNextNumber(),
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => OrdenTrabajo::ESTADO_ABIERTA,
            'ingreso_at' => now(),
        ])->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->from('http://'.$this->testTenantHost.'/taller/ordenes-trabajo')
        ->post('http://'.$this->testTenantHost.'/taller/ordenes-trabajo/'.$ordenId.'/avisar-lista', [
            'telefono' => '987654321',
        ]);

    $response->assertSessionHasErrors(['orden']);

    TenantContext::runForSlug($this->testTenantSlug, function () use ($ordenId): void {
        expect(OrdenTrabajo::query()->find($ordenId)->lista_notificada_at)->toBeNull();
    });
});

it('rechaza un teléfono inválido al avisar', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $ordenId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede, &$ordenId): void {
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        $ordenId = OrdenTrabajo::query()->create([
            'sede_id' => $sede->id,
            'numero' => OrdenTrabajo::generateNextNumber(),
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => OrdenTrabajo::ESTADO_LISTA,
            'ingreso_at' => now(),
            'lista_at' => now(),
        ])->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->from('http://'.$this->testTenantHost.'/taller/ordenes-trabajo')
        ->post('http://'.$this->testTenantHost.'/taller/ordenes-trabajo/'.$ordenId.'/avisar-lista', [
            'telefono' => '123',
        ]);

    $response->assertSessionHasErrors(['telefono']);
});
