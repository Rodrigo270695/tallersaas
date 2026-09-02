<?php

declare(strict_types=1);

use App\Models\CategoriaServicio;
use App\Models\Cliente;
use App\Models\OrdenTrabajo;
use App\Models\OrdenTrabajoLinea;
use App\Models\Producto;
use App\Models\Sede;
use App\Models\Servicio;
use App\Models\Vehiculo;
use App\Tenancy\Facades\Tenant as TenantContext;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;
use Tests\Support\SeedsGeoCatalog;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class, SeedsGeoCatalog::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('Los servicios viven en el schema del tenant (requiere PostgreSQL).');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
    $this->seedGeoCatalog();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('crea una categoría y un servicio de mano de obra', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $this->post('http://'.$this->testTenantHost.'/taller/categorias-servicios', [
        'nombre' => 'Mantenimiento',
        'activo' => true,
    ])->assertSessionHasNoErrors()->assertRedirect();

    $categoriaId = null;
    TenantContext::runForSlug($this->testTenantSlug, function () use (&$categoriaId): void {
        $categoriaId = CategoriaServicio::query()->first()?->id;
        expect($categoriaId)->not->toBeNull();
    });

    $this->post('http://'.$this->testTenantHost.'/taller/servicios', [
        'categoria_id' => $categoriaId,
        'nombre' => 'Cambio de aceite',
        'precio' => 80,
        'duracion_minutos' => 45,
        'activo' => true,
    ])->assertSessionHasNoErrors()->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        $servicio = Servicio::query()->first();
        expect($servicio)->not->toBeNull()
            ->and($servicio->nombre)->toBe('Cambio de aceite')
            ->and((float) $servicio->precio)->toBe(80.0)
            ->and($servicio->duracion_minutos)->toBe(45);
    });
});

it('crea una OT con líneas de servicio y calcula el total', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $clienteId = null;
    $vehiculoId = null;
    $servicioId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$clienteId, &$vehiculoId, &$servicioId): void {
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        $servicio = Servicio::factory()->create(['nombre' => 'Alineación', 'precio' => 100]);
        $clienteId = $cliente->id;
        $vehiculoId = $vehiculo->id;
        $servicioId = $servicio->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/ordenes-trabajo', [
        'sede_id' => $sede->id,
        'cliente_id' => $clienteId,
        'vehiculo_id' => $vehiculoId,
        'lineas' => [
            [
                'servicio_id' => $servicioId,
                'cantidad' => 1,
                'precio_unitario' => 100,
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($servicioId): void {
        $orden = OrdenTrabajo::query()->first();
        expect($orden)->not->toBeNull()
            ->and((float) $orden->total)->toBe(100.0)
            ->and((float) $orden->saldo)->toBe(100.0);

        $linea = OrdenTrabajoLinea::query()->first();
        expect($linea)->not->toBeNull()
            ->and($linea->servicio_id)->toBe($servicioId)
            ->and($linea->tipo)->toBe(OrdenTrabajoLinea::TIPO_SERVICIO)
            ->and($linea->descripcion)->toBe('Alineación');
    });
});

it('permite mezclar servicio y repuesto en la OT', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $clienteId = null;
    $vehiculoId = null;
    $servicioId = null;
    $productoId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$clienteId, &$vehiculoId, &$servicioId, &$productoId): void {
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        $servicioId = Servicio::factory()->create(['precio' => 50])->id;
        $productoId = Producto::factory()->create(['precio_venta' => 25])->id;
        $clienteId = $cliente->id;
        $vehiculoId = $vehiculo->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $this->post('http://'.$this->testTenantHost.'/taller/ordenes-trabajo', [
        'sede_id' => $sede->id,
        'cliente_id' => $clienteId,
        'vehiculo_id' => $vehiculoId,
        'lineas' => [
            ['servicio_id' => $servicioId, 'cantidad' => 1, 'precio_unitario' => 50],
            ['producto_id' => $productoId, 'cantidad' => 2, 'precio_unitario' => 25],
        ],
    ])->assertSessionHasNoErrors();

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        $orden = OrdenTrabajo::query()->first();
        expect((float) $orden->total)->toBe(100.0)
            ->and(OrdenTrabajoLinea::query()->count())->toBe(2);
    });
});
