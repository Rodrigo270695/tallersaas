<?php

declare(strict_types=1);

use App\Models\Aseguradora;
use App\Models\Cliente;
use App\Models\OrdenTrabajo;
use App\Models\Presupuesto;
use App\Models\Sede;
use App\Models\Siniestro;
use App\Models\Vehiculo;
use App\Tenancy\Facades\Tenant as TenantContext;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;
use Tests\Support\SeedsGeoCatalog;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class, SeedsGeoCatalog::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('El portal por placa vive en el schema del tenant (requiere PostgreSQL).');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
    $this->seedGeoCatalog();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('muestra historial, presupuesto y el reparto del siniestro por placa', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede): void {
        $cliente = Cliente::factory()->create([
            'nombres' => 'Ana',
            'apellidos' => 'Prueba',
        ]);
        $vehiculo = Vehiculo::factory()->create([
            'cliente_id' => $cliente->id,
            'placa' => 'ABC-123',
        ]);
        $orden = OrdenTrabajo::query()->create([
            'sede_id' => $sede->id,
            'numero' => 'OT-PORTAL-0001',
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => OrdenTrabajo::ESTADO_EN_PROCESO,
            'ingreso_at' => now(),
            'total' => 1000,
            'subtotal' => 1000,
            'saldo' => 1000,
        ]);
        Presupuesto::query()->create([
            'sede_id' => $sede->id,
            'numero' => 'PRE-PORTAL-0001',
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'orden_trabajo_id' => $orden->id,
            'estado' => Presupuesto::ESTADO_ENVIADO,
            'total' => 1000,
            'created_by_id' => $this->testTenantAdmin->id,
        ]);
        $aseguradora = Aseguradora::query()->create([
            'nombre' => 'Seguro Demo',
            'activo' => true,
        ]);
        Siniestro::query()->create([
            'orden_trabajo_id' => $orden->id,
            'aseguradora_id' => $aseguradora->id,
            'numero' => 'SIN-100',
            'estado' => Siniestro::ESTADO_ABIERTO,
            'cobertura_pct' => 80,
            'monto_reclamado' => 1000,
            'monto_seguro' => 800,
            'monto_cliente' => 200,
        ]);
    });

    $this->get('http://'.$this->testTenantHost.'/placa?placa=abc%20123')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('public/placa')
            ->where('placa', 'ABC123')
            ->has('vehiculos', 1)
            ->where('vehiculos.0.ordenes.0.numero', 'OT-PORTAL-0001')
            ->where('vehiculos.0.ordenes.0.estado', 'en_proceso')
            ->where('vehiculos.0.ordenes.0.siniestro.monto_seguro', '800.00')
            ->where('vehiculos.0.ordenes.0.siniestro.monto_cliente', '200.00')
            ->where('vehiculos.0.presupuestos.0.numero', 'PRE-PORTAL-0001'));
});

it('registra un siniestro y guarda lo que paga el seguro y el cliente', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $ordenId = null;
    $aseguradoraId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede, &$ordenId, &$aseguradoraId): void {
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create([
            'cliente_id' => $cliente->id,
            'placa' => 'SEG-009',
        ]);
        $orden = OrdenTrabajo::query()->create([
            'sede_id' => $sede->id,
            'numero' => 'OT-SEG-0001',
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => OrdenTrabajo::ESTADO_ABIERTA,
            'ingreso_at' => now(),
            'total' => 500,
        ]);
        $ordenId = $orden->id;
        $aseguradoraId = Aseguradora::query()->create([
            'nombre' => 'Rimac Demo',
            'activo' => true,
        ])->id;
    });

    $this->actingAs($this->testTenantAdmin)
        ->post('http://'.$this->testTenantHost.'/taller/siniestros', [
            'orden_trabajo_id' => $ordenId,
            'aseguradora_id' => $aseguradoraId,
            'numero' => 'SIN-500',
            'estado' => 'abierto',
            'cobertura_pct' => 70,
            'monto_reclamado' => 500,
            'numero_poliza' => 'POL-1',
        ])
        ->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        $siniestro = Siniestro::query()->firstOrFail();
        expect($siniestro->monto_seguro)->toBe('350.00')
            ->and($siniestro->monto_cliente)->toBe('150.00');

        $vehiculo = Vehiculo::query()->where('placa', 'SEG-009')->firstOrFail();
        expect($vehiculo->numero_poliza)->toBe('POL-1')
            ->and($vehiculo->aseguradora_id)->not->toBeNull();
    });
});
