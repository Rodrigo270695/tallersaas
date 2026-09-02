<?php

declare(strict_types=1);

use App\Models\CajaSesion;
use App\Models\Cliente;
use App\Models\OrdenTrabajo;
use App\Models\Sede;
use App\Models\Vehiculo;
use App\Models\Venta;
use App\Tenancy\Facades\Tenant as TenantContext;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;
use Tests\Support\SeedsGeoCatalog;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class, SeedsGeoCatalog::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('Caja y ventas viven en el schema del tenant (requiere PostgreSQL).');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
    $this->seedGeoCatalog();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('abre una sesión de caja por sede', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/caja/sesiones', [
        'sede_id' => $sede->id,
        'moneda' => 'PEN',
        'saldo_apertura' => 100,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede): void {
        $sesion = CajaSesion::query()->first();
        expect($sesion)->not->toBeNull()
            ->and($sesion->sede_id)->toBe($sede->id)
            ->and($sesion->estado)->toBe(CajaSesion::ESTADO_ABIERTA);
    });
});

it('cobra una orden de trabajo y registra la venta', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $ordenId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede, &$ordenId): void {
        CajaSesion::query()->create([
            'sede_id' => $sede->id,
            'estado' => CajaSesion::ESTADO_ABIERTA,
            'moneda' => 'PEN',
            'saldo_apertura' => 0,
            'opened_at' => now(),
            'opened_by_id' => $this->testTenantAdmin->id,
        ]);

        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        $orden = OrdenTrabajo::query()->create([
            'sede_id' => $sede->id,
            'numero' => OrdenTrabajo::generateNextNumber(),
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => OrdenTrabajo::ESTADO_ABIERTA,
            'ingreso_at' => now(),
        ]);
        $ordenId = $orden->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->post(
        'http://'.$this->testTenantHost.'/taller/ordenes-trabajo/'.$ordenId.'/cobrar',
        [
            'lineas' => [
                ['concepto' => 'Cambio de aceite', 'cantidad' => 1, 'precio_unitario' => 80],
            ],
            'pagos' => [
                ['metodo' => 'efectivo', 'monto' => 80, 'monto_recibido' => 100],
            ],
        ],
    );

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($ordenId): void {
        $venta = Venta::query()->first();
        expect($venta)->not->toBeNull()
            ->and($venta->numero)->toStartWith('VTA-'.now()->year.'-')
            ->and($venta->orden_trabajo_id)->toBe($ordenId)
            ->and((float) $venta->total)->toBe(80.0);

        $orden = OrdenTrabajo::query()->find($ordenId);
        expect((float) $orden->pagado_total)->toBe(80.0)
            ->and((float) $orden->saldo)->toBe(0.0);
    });
});

it('exige caja abierta para cobrar', function (): void {
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
        ->post('http://'.$this->testTenantHost.'/taller/ordenes-trabajo/'.$ordenId.'/cobrar', [
            'lineas' => [
                ['concepto' => 'Servicio', 'cantidad' => 1, 'precio_unitario' => 50],
            ],
            'pagos' => [
                ['metodo' => 'yape', 'monto' => 50],
            ],
        ]);

    $response->assertSessionHasErrors('caja_sesion_id');
});
