<?php

declare(strict_types=1);

use App\Models\Cliente;
use App\Models\OrdenTrabajo;
use App\Models\Presupuesto;
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
        $this->markTestSkipped('Los presupuestos viven en el schema del tenant (requiere PostgreSQL).');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
    $this->seedGeoCatalog();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('lista presupuestos del taller', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede): void {
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        Presupuesto::query()->create([
            'sede_id' => $sede->id,
            'numero' => Presupuesto::generateNextNumber(),
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => Presupuesto::ESTADO_BORRADOR,
            'valido_hasta' => now()->addDays(7)->toDateString(),
            'public_token' => (string) str()->uuid(),
        ]);
    });

    $this->actingAs($this->testTenantAdmin);

    $this->get('http://'.$this->testTenantHost.'/taller/presupuestos')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('taller/presupuestos/index')
            ->has('presupuestos.data', 1)
            ->has('sedes')
            ->has('servicios')
        );
});

it('crea un presupuesto con líneas y lo envía al cliente', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $clienteId = null;
    $vehiculoId = null;
    $servicioId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$clienteId, &$vehiculoId, &$servicioId): void {
        $cliente = Cliente::factory()->create(['telefono' => '987654321']);
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        $servicioId = Servicio::query()->create([
            'nombre' => 'Cambio de aceite',
            'precio' => 80,
            'activo' => true,
        ])->id;
        $clienteId = $cliente->id;
        $vehiculoId = $vehiculo->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $this->post('http://'.$this->testTenantHost.'/taller/presupuestos', [
        'sede_id' => $sede->id,
        'cliente_id' => $clienteId,
        'vehiculo_id' => $vehiculoId,
        'valido_hasta' => now()->addDays(5)->toDateString(),
        'diagnostico' => 'Fuga de aceite',
        'lineas' => [
            [
                'servicio_id' => $servicioId,
                'descripcion' => 'Cambio de aceite',
                'cantidad' => 1,
                'precio_unitario' => 80,
            ],
        ],
    ])->assertSessionHasNoErrors();

    $presupuesto = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$presupuesto): void {
        $presupuesto = Presupuesto::query()->with('items')->first();
        expect($presupuesto)->not->toBeNull()
            ->and($presupuesto->estado)->toBe(Presupuesto::ESTADO_BORRADOR)
            ->and((float) $presupuesto->total)->toBeGreaterThan(0)
            ->and($presupuesto->items)->toHaveCount(1);
    });

    $this->post('http://'.$this->testTenantHost.'/taller/presupuestos/'.$presupuesto->id.'/enviar', [
        'telefono' => '987654321',
        'mensaje' => 'Revisa tu presupuesto',
    ])->assertSessionHasNoErrors();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($presupuesto): void {
        expect($presupuesto->fresh()->estado)->toBe(Presupuesto::ESTADO_ENVIADO);
    });
});

it('permite al cliente aprobar desde el enlace público', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $token = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede, &$token): void {
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        $token = (string) str()->uuid();
        Presupuesto::query()->create([
            'sede_id' => $sede->id,
            'numero' => Presupuesto::generateNextNumber(),
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => Presupuesto::ESTADO_ENVIADO,
            'enviado_at' => now(),
            'valido_hasta' => now()->addDays(3)->toDateString(),
            'public_token' => $token,
            'total' => 100,
            'subtotal' => 84.75,
            'igv_total' => 15.25,
        ]);
    });

    $this->get('http://'.$this->testTenantHost.'/p/'.$token)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('public/presupuesto')
            ->where('presupuesto.puede_responder', true)
        );

    $this->post('http://'.$this->testTenantHost.'/p/'.$token.'/aprobar')
        ->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($token): void {
        $presupuesto = Presupuesto::query()->where('public_token', $token)->first();
        expect($presupuesto?->estado)->toBe(Presupuesto::ESTADO_APROBADO);
    });
});

it('aplica un presupuesto aprobado a la orden de trabajo', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $presupuestoId = null;
    $ordenId = null;
    $servicioId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede, &$presupuestoId, &$ordenId, &$servicioId): void {
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        $servicioId = Servicio::query()->create([
            'nombre' => 'Frenos',
            'precio' => 120,
            'activo' => true,
        ])->id;
        $ordenId = OrdenTrabajo::query()->create([
            'sede_id' => $sede->id,
            'numero' => OrdenTrabajo::generateNextNumber(),
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => OrdenTrabajo::ESTADO_ABIERTA,
            'ingreso_at' => now(),
        ])->id;

        $presupuesto = Presupuesto::query()->create([
            'sede_id' => $sede->id,
            'numero' => Presupuesto::generateNextNumber(),
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'orden_trabajo_id' => $ordenId,
            'estado' => Presupuesto::ESTADO_APROBADO,
            'aprobado_at' => now(),
            'valido_hasta' => now()->addDays(3)->toDateString(),
            'public_token' => (string) str()->uuid(),
            'total' => 120,
            'subtotal' => 101.69,
            'igv_total' => 18.31,
        ]);

        $presupuesto->items()->create([
            'tipo' => 'servicio',
            'servicio_id' => $servicioId,
            'descripcion' => 'Frenos',
            'cantidad' => 1,
            'precio_unitario' => 120,
            'subtotal' => 120,
            'orden' => 0,
        ]);

        $presupuestoId = $presupuesto->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $this->post('http://'.$this->testTenantHost.'/taller/presupuestos/'.$presupuestoId.'/aplicar')
        ->assertSessionHasNoErrors();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($presupuestoId, $ordenId): void {
        $presupuesto = Presupuesto::query()->find($presupuestoId);
        $orden = OrdenTrabajo::query()->with('lineas')->find($ordenId);

        expect($presupuesto?->estado)->toBe(Presupuesto::ESTADO_CONVERTIDO)
            ->and($orden?->presupuesto_id)->toBe($presupuestoId)
            ->and($orden?->lineas)->toHaveCount(1)
            ->and((float) $orden?->total)->toBeGreaterThan(0);
    });
});

it('crea un presupuesto desde una orden de trabajo', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $ordenId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede, &$ordenId): void {
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        $orden = OrdenTrabajo::query()->create([
            'sede_id' => $sede->id,
            'numero' => OrdenTrabajo::generateNextNumber(),
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => OrdenTrabajo::ESTADO_ABIERTA,
            'ingreso_at' => now(),
            'diagnostico' => 'Ruido en suspensión',
        ]);
        $ordenId = $orden->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $this->post('http://'.$this->testTenantHost.'/taller/ordenes-trabajo/'.$ordenId.'/presupuesto')
        ->assertSessionHasNoErrors();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($ordenId): void {
        $presupuesto = Presupuesto::query()->where('orden_trabajo_id', $ordenId)->first();
        expect($presupuesto)->not->toBeNull()
            ->and($presupuesto->diagnostico)->toBe('Ruido en suspensión');
    });
});
