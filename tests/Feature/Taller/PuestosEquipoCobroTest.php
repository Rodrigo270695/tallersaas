<?php

declare(strict_types=1);

use App\Models\CajaSesion;
use App\Models\Cliente;
use App\Models\NotificationQueue;
use App\Models\OrdenTrabajo;
use App\Models\OrdenTrabajoChecklist;
use App\Models\OrdenTrabajoMecanico;
use App\Models\Puesto;
use App\Models\Sede;
use App\Models\Vehiculo;
use App\Models\VehiculoKilometraje;
use App\Models\Venta;
use App\Services\Taller\AvisarCobroService;
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

it('crea y lista un puesto de la sede', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/puestos', [
        'sede_id' => $sede->id,
        'nombre' => 'Fosa 1',
        'activo' => true,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $this->get('http://'.$this->testTenantHost.'/taller/puestos')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('taller/puestos/index')
            ->has('puestos.data')
            ->where('stats.total', 1));

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        expect(Puesto::query()->where('nombre', 'Fosa 1')->exists())->toBeTrue();
    });
});

it('asigna mecánico, checklist y puesto a la orden', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $ordenId = null;
    $puestoId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede, &$ordenId, &$puestoId): void {
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        $puestoId = Puesto::query()->create([
            'sede_id' => $sede->id,
            'nombre' => 'Elevador',
            'activo' => true,
        ])->id;
        $ordenId = OrdenTrabajo::query()->create([
            'sede_id' => $sede->id,
            'numero' => OrdenTrabajo::generateNextNumber(),
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => OrdenTrabajo::ESTADO_ABIERTA,
        ])->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/ordenes-trabajo/'.$ordenId.'/equipo', [
        'puesto_id' => $puestoId,
        'mecanicos' => [
            ['user_id' => $this->testTenantAdmin->id, 'rol' => 'responsable'],
        ],
        'checklist' => [
            ['clave' => 'frenos', 'estado' => 'observacion', 'nota' => 'Pastillas gastadas'],
        ],
    ]);

    $response->assertSessionHasNoErrors();

    $this->get('http://'.$this->testTenantHost.'/taller/ordenes-trabajo/'.$ordenId)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('taller/ordenes-trabajo/show')
            ->has('checklist_catalogo', 10)
            ->has('puestos', 1)
            ->has('mecanicos')
            ->where('orden.puesto_id', $puestoId)
            ->has('orden.mecanicos', 1)
            ->where('orden.checklist_items.0.clave', 'frenos'));

    TenantContext::runForSlug($this->testTenantSlug, function () use ($ordenId, $puestoId): void {
        $orden = OrdenTrabajo::query()->findOrFail($ordenId);
        expect($orden->puesto_id)->toBe($puestoId)
            ->and(OrdenTrabajoMecanico::query()->where('orden_trabajo_id', $ordenId)->count())->toBe(1)
            ->and(OrdenTrabajoChecklist::query()->where('orden_trabajo_id', $ordenId)->where('clave', 'frenos')->value('nota'))
            ->toBe('Pastillas gastadas');
    });
});

it('registra el kilometraje de ingreso sin duplicar el mismo valor', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $clienteId = null;
    $vehiculoId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$clienteId, &$vehiculoId): void {
        $clienteId = Cliente::factory()->create()->id;
        $vehiculoId = Vehiculo::factory()->create(['cliente_id' => $clienteId])->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $payload = [
        'sede_id' => $sede->id,
        'cliente_id' => $clienteId,
        'vehiculo_id' => $vehiculoId,
        'km_ingreso' => 12000,
    ];

    $this->post('http://'.$this->testTenantHost.'/taller/ordenes-trabajo', $payload)
        ->assertSessionHasNoErrors();

    $ordenId = null;
    TenantContext::runForSlug($this->testTenantSlug, function () use (&$ordenId): void {
        $ordenId = OrdenTrabajo::query()->value('id');
        expect(VehiculoKilometraje::query()->count())->toBe(1);
    });

    $this->put('http://'.$this->testTenantHost.'/taller/ordenes-trabajo/'.$ordenId, [
        ...$payload,
        'estado' => 'abierta',
        'km_ingreso' => 12000,
    ])->assertSessionHasNoErrors();

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        expect(VehiculoKilometraje::query()->count())->toBe(1)
            ->and((int) Vehiculo::query()->value('kilometraje'))->toBe(12000);
    });
});

it('encola un aviso de cobro cuando el cliente tiene teléfono', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $adminId = $this->testTenantAdmin->id;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede, $adminId): void {
        $cliente = Cliente::factory()->create(['telefono' => '987654321']);
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id, 'placa' => 'ABC123']);
        $sesion = CajaSesion::query()->create([
            'sede_id' => $sede->id,
            'estado' => CajaSesion::ESTADO_ABIERTA,
            'moneda' => 'PEN',
            'saldo_apertura' => 0,
            'opened_at' => now(),
            'opened_by_id' => $adminId,
        ]);
        $orden = OrdenTrabajo::query()->create([
            'sede_id' => $sede->id,
            'numero' => OrdenTrabajo::generateNextNumber(),
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => OrdenTrabajo::ESTADO_LISTA,
        ]);
        $venta = Venta::query()->create([
            'numero' => 'V-1',
            'sede_id' => $sede->id,
            'caja_sesion_id' => $sesion->id,
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'orden_trabajo_id' => $orden->id,
            'moneda' => 'PEN',
            'estado' => Venta::ESTADO_PAGADO,
            'subtotal' => 100,
            'igv_monto' => 18,
            'total' => 118,
            'metodo_pago' => 'efectivo',
            'monto_recibido' => 118,
        ]);

        $result = app(AvisarCobroService::class)->avisar($orden->fresh(['cliente', 'vehiculo']), $venta);

        expect($result['wa_url'])->toContain('wa.me/51987654321')
            ->and(NotificationQueue::query()->where('tipo', 'ot_cobro')->where('referencia_id', $venta->id)->exists())
            ->toBeTrue();
    });
});
