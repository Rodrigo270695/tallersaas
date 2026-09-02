<?php

declare(strict_types=1);

use App\Models\CajaSesion;
use App\Models\CategoriaProducto;
use App\Models\Cliente;
use App\Models\ExistenciaSede;
use App\Models\MovimientoInventario;
use App\Models\OrdenTrabajo;
use App\Models\Producto;
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
        $this->markTestSkipped('El inventario vive en el schema del tenant (requiere PostgreSQL).');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
    $this->seedGeoCatalog();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('crea una categoría de inventario', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/inventario/categorias', [
        'nombre' => 'Filtros',
        'descripcion' => 'Filtros de aceite y aire',
        'activo' => true,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        $categoria = CategoriaProducto::query()->first();
        expect($categoria)->not->toBeNull()
            ->and($categoria->nombre)->toBe('Filtros')
            ->and($categoria->activo)->toBeTrue();
    });
});

it('crea un repuesto con stock inicial', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/inventario/productos', [
        'nombre' => 'Filtro de aceite',
        'sku' => 'FO-001',
        'unidad' => 'UN',
        'precio_venta' => 35.5,
        'activo' => true,
        'stock_inicial_sede_id' => $sede->id,
        'stock_inicial_cantidad' => 10,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede): void {
        $producto = Producto::query()->first();
        expect($producto)->not->toBeNull()
            ->and($producto->nombre)->toBe('Filtro de aceite')
            ->and($producto->sku)->toBe('FO-001');

        $existencia = ExistenciaSede::query()
            ->where('producto_id', $producto->id)
            ->where('sede_id', $sede->id)
            ->first();

        expect($existencia)->not->toBeNull()
            ->and((float) $existencia->cantidad)->toBe(10.0);

        $mov = MovimientoInventario::query()->first();
        expect($mov)->not->toBeNull()
            ->and($mov->tipo)->toBe(MovimientoInventario::TIPO_ENTRADA)
            ->and((float) $mov->delta)->toBe(10.0);
    });
});

it('ajusta el stock a una cantidad exacta', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $productoId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede, &$productoId): void {
        $producto = Producto::factory()->create();
        $productoId = $producto->id;
        MovimientoInventario::aplicar(
            (string) $producto->id,
            (string) $sede->id,
            MovimientoInventario::TIPO_ENTRADA,
            '4',
            'stock inicial',
            (string) $this->testTenantAdmin->id,
        );
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->patch('http://'.$this->testTenantHost.'/inventario/stock', [
        'producto_id' => $productoId,
        'sede_id' => $sede->id,
        'cantidad' => 12,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($productoId, $sede): void {
        $existencia = ExistenciaSede::query()
            ->where('producto_id', $productoId)
            ->where('sede_id', $sede->id)
            ->first();

        expect((float) $existencia->cantidad)->toBe(12.0);

        $ajuste = MovimientoInventario::query()->where('tipo', MovimientoInventario::TIPO_AJUSTE)->first();
        expect($ajuste)->not->toBeNull()
            ->and((float) $ajuste->delta)->toBe(8.0);
    });
});

it('no permite existencias negativas', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $productoId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede, &$productoId): void {
        $producto = Producto::factory()->create();
        $productoId = $producto->id;
        MovimientoInventario::aplicar(
            (string) $producto->id,
            (string) $sede->id,
            MovimientoInventario::TIPO_ENTRADA,
            '2',
            null,
            (string) $this->testTenantAdmin->id,
        );
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->from('http://'.$this->testTenantHost.'/inventario/movimientos')
        ->post('http://'.$this->testTenantHost.'/inventario/movimientos', [
            'producto_id' => $productoId,
            'sede_id' => $sede->id,
            'tipo' => 'salida',
            'cantidad' => 5,
        ]);

    $response->assertSessionHasErrors('cantidad');

    TenantContext::runForSlug($this->testTenantSlug, function () use ($productoId, $sede): void {
        $existencia = ExistenciaSede::query()
            ->where('producto_id', $productoId)
            ->where('sede_id', $sede->id)
            ->first();

        expect((float) $existencia->cantidad)->toBe(2.0);
    });
});

it('cobra una OT con repuesto y descuenta stock', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $ordenId = null;
    $productoId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede, &$ordenId, &$productoId): void {
        CajaSesion::query()->create([
            'sede_id' => $sede->id,
            'estado' => CajaSesion::ESTADO_ABIERTA,
            'moneda' => 'PEN',
            'saldo_apertura' => 0,
            'opened_at' => now(),
            'opened_by_id' => $this->testTenantAdmin->id,
        ]);

        $producto = Producto::factory()->create([
            'nombre' => 'Pastillas de freno',
            'precio_venta' => 80,
        ]);
        $productoId = $producto->id;
        MovimientoInventario::aplicar(
            (string) $producto->id,
            (string) $sede->id,
            MovimientoInventario::TIPO_ENTRADA,
            '6',
            null,
            (string) $this->testTenantAdmin->id,
        );

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

    $response = $this->post(
        'http://'.$this->testTenantHost.'/taller/ordenes-trabajo/'.$ordenId.'/cobrar',
        [
            'lineas' => [
                [
                    'concepto' => 'Pastillas de freno',
                    'cantidad' => 2,
                    'precio_unitario' => 80,
                    'producto_id' => $productoId,
                ],
            ],
            'pagos' => [
                ['metodo' => 'efectivo', 'monto' => 160, 'monto_recibido' => 160],
            ],
        ],
    );

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($productoId, $sede): void {
        $existencia = ExistenciaSede::query()
            ->where('producto_id', $productoId)
            ->where('sede_id', $sede->id)
            ->first();

        expect((float) $existencia->cantidad)->toBe(4.0);

        $salida = MovimientoInventario::query()
            ->where('tipo', MovimientoInventario::TIPO_SALIDA)
            ->where('producto_id', $productoId)
            ->first();

        expect($salida)->not->toBeNull()
            ->and((float) $salida->delta)->toBe(-2.0)
            ->and($salida->venta_id)->not->toBeNull();
    });
});
