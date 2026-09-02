<?php

declare(strict_types=1);

use App\Models\Cita;
use App\Models\Cliente;
use App\Models\NotificationQueue;
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
        $this->markTestSkipped('Las citas viven en el schema del tenant (requiere PostgreSQL).');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
    $this->seedGeoCatalog();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('crea una cita de recepción', function (): void {
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

    $inicio = now('America/Lima')->addDay()->setTime(10, 0)->format('Y-m-d H:i:s');

    $this->post('http://'.$this->testTenantHost.'/taller/citas', [
        'sede_id' => $sede->id,
        'cliente_id' => $clienteId,
        'vehiculo_id' => $vehiculoId,
        'inicia_at' => $inicio,
        'duracion_minutos' => 60,
        'motivo' => 'Cambio de aceite',
    ])->assertSessionHasNoErrors()->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        $cita = Cita::query()->first();
        expect($cita)->not->toBeNull()
            ->and($cita->estado)->toBe(Cita::ESTADO_PROGRAMADA)
            ->and($cita->motivo)->toBe('Cambio de aceite')
            ->and($cita->duracion_minutos)->toBe(60);

        expect(NotificationQueue::query()->where('tipo', 'cita_creada')->count())->toBe(1);
    });
});

it('convierte una cita en orden de trabajo', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $citaId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede, &$citaId): void {
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        $cita = Cita::factory()->create([
            'sede_id' => $sede->id,
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'inicia_at' => now(),
            'motivo' => 'Frenos',
        ]);
        $citaId = $cita->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $this->post('http://'.$this->testTenantHost.'/taller/citas/'.$citaId.'/convertir')
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($citaId): void {
        $cita = Cita::query()->find($citaId);
        $orden = OrdenTrabajo::query()->first();

        expect($cita)->not->toBeNull()
            ->and($cita->estado)->toBe(Cita::ESTADO_CONVERTIDA)
            ->and($orden)->not->toBeNull()
            ->and($orden->cita_id)->toBe($citaId)
            ->and($orden->solicitud_cliente)->toBe('Frenos')
            ->and($orden->estado)->toBe(OrdenTrabajo::ESTADO_ABIERTA)
            ->and($cita->orden_trabajo_id)->toBe($orden->id);
    });
});

it('no convierte dos veces la misma cita', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $citaId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede, &$citaId): void {
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        $citaId = Cita::factory()->create([
            'sede_id' => $sede->id,
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'inicia_at' => now(),
        ])->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $url = 'http://'.$this->testTenantHost.'/taller/citas/'.$citaId.'/convertir';
    $this->post($url)->assertSessionHasNoErrors();
    $this->post($url)->assertSessionHasErrors('cita');

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        expect(OrdenTrabajo::query()->count())->toBe(1);
    });
});
