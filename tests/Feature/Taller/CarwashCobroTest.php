<?php

declare(strict_types=1);

use App\Models\CajaSesion;
use App\Models\Cliente;
use App\Models\Lavado;
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
        $this->markTestSkipped('El esquema del tenant solo existe en PostgreSQL.');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
    $this->seedGeoCatalog();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('cobra un car wash y lo muestra como venta con ticket', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $clienteId = null;
    $adminId = $this->testTenantAdmin->id;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede, $adminId, &$clienteId): void {
        $cliente = Cliente::factory()->create();
        $clienteId = $cliente->id;
        Vehiculo::factory()->create(['cliente_id' => $cliente->id, 'placa' => 'CW-001']);
        CajaSesion::query()->create([
            'sede_id' => $sede->id,
            'estado' => CajaSesion::ESTADO_ABIERTA,
            'moneda' => 'PEN',
            'saldo_apertura' => 0,
            'opened_at' => now(),
            'opened_by_id' => $adminId,
        ]);
    });

    $this->actingAs($this->testTenantAdmin);
    $host = 'http://'.$this->testTenantHost;

    $this->post($host.'/taller/lavados', [
        'sede_id' => $sede->id,
        'cliente_id' => $clienteId,
        'placa' => 'CW-001',
    ])->assertSessionHasNoErrors()->assertRedirect();

    $lavadoId = null;
    TenantContext::runForSlug($this->testTenantSlug, function () use (&$lavadoId): void {
        $lavadoId = Lavado::query()->value('id');
        expect($lavadoId)->not->toBeNull();
    });

    $this->put($host.'/taller/lavados/'.$lavadoId.'/cargos', [
        'lineas' => [[
            'descripcion' => 'Lavado completo',
            'cantidad' => 1,
            'precio_unitario' => 45,
        ]],
    ])->assertSessionHasNoErrors();

    $this->post($host.'/taller/lavados/'.$lavadoId.'/cobrar', [
        'lineas' => [[
            'concepto' => 'Lavado completo',
            'cantidad' => 1,
            'precio_unitario' => 45,
        ]],
        'pagos' => [[
            'metodo' => 'efectivo',
            'monto' => 45,
            'monto_recibido' => 45,
        ]],
        'tipo_comprobante_sunat' => 0,
    ])->assertSessionHasNoErrors()->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($lavadoId): void {
        $lavado = Lavado::query()->findOrFail($lavadoId);
        $venta = Venta::query()->where('lavado_id', $lavadoId)->first();

        expect($lavado->estado)->toBe(Lavado::ESTADO_COBRADO)
            ->and($venta)->not->toBeNull()
            ->and($venta->numero)->not->toBeEmpty();
    });
});
