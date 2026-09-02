<?php

declare(strict_types=1);

use App\Models\CajaSesion;
use App\Models\Cliente;
use App\Models\OrdenTrabajo;
use App\Models\Sede;
use App\Models\User;
use App\Models\Vehiculo;
use App\Models\Venta;
use App\Tenancy\Facades\Tenant as TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;
use Tests\Support\SeedsGeoCatalog;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class, SeedsGeoCatalog::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('Los reportes viven en el schema del tenant (requiere PostgreSQL).');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
    $this->seedGeoCatalog();

    config(['app.timezone' => 'America/Lima']);
    $now = CarbonImmutable::parse('2026-08-18 15:00:00', 'America/Lima');
    Carbon::setTestNow($now);
    CarbonImmutable::setTestNow($now);
});

afterEach(function (): void {
    Carbon::setTestNow();
    CarbonImmutable::setTestNow();
    $this->tearDownTestTenant();
});

it('resume ventas cobradas, ticket promedio y excluye anuladas', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede): void {
        $sesion = CajaSesion::query()->create([
            'sede_id' => $sede->id,
            'estado' => CajaSesion::ESTADO_ABIERTA,
            'moneda' => 'PEN',
            'saldo_apertura' => 0,
            'opened_at' => now(),
            'opened_by_id' => $this->testTenantAdmin->id,
        ]);
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);

        foreach ([
            ['total' => 80, 'metodo' => 'efectivo', 'estado' => Venta::ESTADO_PAGADO, 'fecha' => now()],
            ['total' => 120, 'metodo' => 'yape', 'estado' => Venta::ESTADO_PAGADO, 'fecha' => now()],
            ['total' => 500, 'metodo' => 'tarjeta', 'estado' => Venta::ESTADO_ANULADO, 'fecha' => now()],
            ['total' => 90, 'metodo' => 'efectivo', 'estado' => Venta::ESTADO_PAGADO, 'fecha' => now()->subMonth()],
        ] as $i => $row) {
            Venta::query()->create([
                'numero' => 'VTA-TEST-'.($i + 1),
                'sede_id' => $sede->id,
                'caja_sesion_id' => $sesion->id,
                'cliente_id' => $cliente->id,
                'vehiculo_id' => $vehiculo->id,
                'moneda' => 'PEN',
                'estado' => $row['estado'],
                'subtotal' => $row['total'],
                'igv_monto' => 0,
                'descuento_monto' => 0,
                'total' => $row['total'],
                'metodo_pago' => $row['metodo'],
                'fecha_pago' => $row['fecha'],
                'created_by_id' => $this->testTenantAdmin->id,
            ]);
        }
    });

    $this->actingAs($this->testTenantAdmin);

    $this->get('http://'.$this->testTenantHost.'/reportes/financiero?periodo=hoy')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('reportes/financiero/index')
            ->where('periodo', 'hoy')
            ->where('kpis.ventas_count', 2)
            ->where('kpis.ventas_total', '200.00')
            ->where('kpis.ticket_promedio', '100.00')
            ->has('por_metodo', 2)
            ->has('por_sede', 1)
        );

    $this->get('http://'.$this->testTenantHost.'/reportes/financiero?periodo=mes_pasado')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('kpis.ventas_count', 1)
            ->where('kpis.ventas_total', '90.00')
            ->where('kpis.ticket_promedio', '90.00')
        );
});

it('cuenta órdenes del periodo y el snapshot actual del taller', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede): void {
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);

        OrdenTrabajo::query()->create([
            'sede_id' => $sede->id,
            'numero' => 'OT-2026-00001',
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => OrdenTrabajo::ESTADO_ABIERTA,
            'ingreso_at' => now(),
            'created_by_id' => $this->testTenantAdmin->id,
        ]);
        OrdenTrabajo::query()->create([
            'sede_id' => $sede->id,
            'numero' => 'OT-2026-00002',
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => OrdenTrabajo::ESTADO_LISTA,
            'ingreso_at' => now(),
            'created_by_id' => $this->testTenantAdmin->id,
        ]);
        OrdenTrabajo::query()->create([
            'sede_id' => $sede->id,
            'numero' => 'OT-2026-00003',
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => OrdenTrabajo::ESTADO_ABIERTA,
            'ingreso_at' => now()->subMonth(),
            'created_by_id' => $this->testTenantAdmin->id,
        ]);
    });

    $this->actingAs($this->testTenantAdmin);

    $this->get('http://'.$this->testTenantHost.'/reportes/ordenes?periodo=hoy')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('reportes/ordenes/index')
            ->where('ingresadas', 2)
            ->where('en_periodo.abierta', 1)
            ->where('en_periodo.lista', 1)
            ->where('snapshot.abierta', 2)
            ->where('snapshot.lista', 1)
            ->has('por_usuario', 1)
            ->where('por_usuario.0.total', 2)
        );
});

it('impide al mecánico ver el reporte financiero y le permite el de órdenes', function (): void {
    $previousTeam = getPermissionsTeamId();
    setPermissionsTeamId((string) $this->testTenant->id);

    $mecanico = User::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'is_active' => true,
        'email_verified_at' => now(),
    ]);
    $mecanico->assignRole('mecanico');
    setPermissionsTeamId($previousTeam);

    $this->actingAs($mecanico);

    $this->get('http://'.$this->testTenantHost.'/reportes/financiero')->assertForbidden();
    $this->get('http://'.$this->testTenantHost.'/reportes/ordenes')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('reportes/ordenes/index'));
});
