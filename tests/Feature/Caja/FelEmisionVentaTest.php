<?php

declare(strict_types=1);

use App\Models\CajaSesion;
use App\Models\Cliente;
use App\Models\FelDocument;
use App\Models\FelSerie;
use App\Models\OrdenTrabajo;
use App\Models\Sede;
use App\Models\TallerSetting;
use App\Models\Vehiculo;
use App\Models\Venta;
use App\Tenancy\Facades\Tenant as TenantContext;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;
use Tests\Support\SeedsGeoCatalog;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class, SeedsGeoCatalog::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('FEL vive en el schema del tenant (requiere PostgreSQL).');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
    $this->seedGeoCatalog();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

function configurarApisunat(): void
{
    TallerSetting::current()->update([
        'ruc' => '20123456789',
        'razon_social' => 'Taller Test S.A.C.',
        'emite_comprobantes_sunat' => true,
        'apisunat_token_enc' => Crypt::encryptString('token-test-apisunat'),
        'apisunat_configurado' => true,
        'apisunat_mode' => 'sandbox',
    ]);
}

function fakeApisunatOk(): void
{
    Http::fake([
        'sandbox.apisunat.pe/*' => Http::response([
            'success' => true,
            'payload' => [
                'estado' => 'ACEPTADO',
                'pdf' => [
                    'ticket' => 'https://example.test/boleta.pdf',
                    'a4' => 'https://example.test/boleta-a4.pdf',
                ],
                'xml' => 'https://example.test/boleta.xml',
                'cdr' => 'https://example.test/boleta.cdr',
            ],
        ], 200),
    ]);
}

/**
 * @return array{sede: Sede, orden_id: string}
 */
function abrirCajaYOrden(
    string $tenantId,
    string $tenantSlug,
    string $adminId,
    int $distritoId,
    ?Cliente $cliente = null,
): array {
    $sede = Sede::factory()->create([
        'tenant_id' => $tenantId,
        'distrito_id' => $distritoId,
    ]);

    $ordenId = null;

    TenantContext::runForSlug($tenantSlug, function () use ($sede, $cliente, $adminId, &$ordenId): void {
        configurarApisunat();

        CajaSesion::query()->create([
            'sede_id' => $sede->id,
            'estado' => CajaSesion::ESTADO_ABIERTA,
            'moneda' => 'PEN',
            'saldo_apertura' => 0,
            'opened_at' => now(),
            'opened_by_id' => $adminId,
        ]);

        $cliente ??= Cliente::factory()->create();
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

    return ['sede' => $sede, 'orden_id' => $ordenId];
}

it('cobra con boleta y emite el comprobante en APISUNAT', function (): void {
    fakeApisunatOk();
    ['orden_id' => $ordenId] = abrirCajaYOrden(
        $this->testTenant->id,
        $this->testTenantSlug,
        $this->testTenantAdmin->id,
        $this->testDistritoId,
    );

    $this->actingAs($this->testTenantAdmin);

    $response = $this->post(
        'http://'.$this->testTenantHost.'/taller/ordenes-trabajo/'.$ordenId.'/cobrar',
        [
            'lineas' => [
                ['concepto' => 'Alineamiento', 'cantidad' => 1, 'precio_unitario' => 80],
            ],
            'pagos' => [
                ['metodo' => 'efectivo', 'monto' => 80, 'monto_recibido' => 80],
            ],
            'tipo_comprobante_sunat' => 2,
        ],
    );

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        $venta = Venta::query()->first();
        $doc = FelDocument::query()->first();

        expect($venta)->not->toBeNull()
            ->and($venta->tipo_comprobante_sunat)->toBe(2)
            ->and($venta->fel_estado)->toBe(Venta::FEL_EMITIDO)
            ->and($doc)->not->toBeNull()
            ->and($doc->estado)->toBe(FelDocument::ESTADO_EMITIDO)
            ->and($doc->serie)->toBe('B001')
            ->and($doc->url_pdf)->toBe('https://example.test/boleta.pdf');
    });

    Http::assertSent(fn ($request) => str_contains($request->url(), 'sandbox.apisunat.pe/api/v3/documents'));
});

it('registra el cobro aunque SUNAT rechace la factura sin RUC', function (): void {
    fakeApisunatOk();
    $cliente = null;
    TenantContext::runForSlug($this->testTenantSlug, function () use (&$cliente): void {
        $cliente = Cliente::factory()->create([
            'tipo_documento' => 'DNI',
            'numero_documento' => '12345678',
        ]);
    });

    ['orden_id' => $ordenId] = abrirCajaYOrden(
        $this->testTenant->id,
        $this->testTenantSlug,
        $this->testTenantAdmin->id,
        $this->testDistritoId,
        $cliente,
    );

    $this->actingAs($this->testTenantAdmin);

    $response = $this->post(
        'http://'.$this->testTenantHost.'/taller/ordenes-trabajo/'.$ordenId.'/cobrar',
        [
            'lineas' => [
                ['concepto' => 'Diagnóstico', 'cantidad' => 1, 'precio_unitario' => 50],
            ],
            'pagos' => [
                ['metodo' => 'yape', 'monto' => 50],
            ],
            'tipo_comprobante_sunat' => 1,
        ],
    );

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        $venta = Venta::query()->first();
        expect($venta)->not->toBeNull()
            ->and((float) $venta->total)->toBe(50.0)
            ->and($venta->tipo_comprobante_sunat)->toBe(1)
            ->and(FelDocument::query()->count())->toBe(0);
    });

    Http::assertNothingSent();
});

it('no pierde el cobro si APISUNAT responde error', function (): void {
    Http::fake([
        'sandbox.apisunat.pe/*' => Http::response([
            'success' => false,
            'message' => 'Serie no autorizada',
        ], 422),
    ]);

    ['orden_id' => $ordenId] = abrirCajaYOrden(
        $this->testTenant->id,
        $this->testTenantSlug,
        $this->testTenantAdmin->id,
        $this->testDistritoId,
    );

    $this->actingAs($this->testTenantAdmin);

    $response = $this->post(
        'http://'.$this->testTenantHost.'/taller/ordenes-trabajo/'.$ordenId.'/cobrar',
        [
            'lineas' => [
                ['concepto' => 'Cambio de aceite', 'cantidad' => 1, 'precio_unitario' => 80],
            ],
            'pagos' => [
                ['metodo' => 'efectivo', 'monto' => 80, 'monto_recibido' => 80],
            ],
            'tipo_comprobante_sunat' => 2,
        ],
    );

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        $venta = Venta::query()->first();
        $doc = FelDocument::query()->first();

        expect($venta)->not->toBeNull()
            ->and($venta->estado)->toBe(Venta::ESTADO_PAGADO)
            ->and($venta->fel_estado)->toBe(Venta::FEL_RECHAZADO)
            ->and($doc?->estado)->toBe(FelDocument::ESTADO_RECHAZADO)
            ->and($doc?->error_mensaje)->toContain('Serie no autorizada');
    });
});

it('lista comprobantes y no expone el token de APISUNAT', function (): void {
    fakeApisunatOk();
    ['orden_id' => $ordenId] = abrirCajaYOrden(
        $this->testTenant->id,
        $this->testTenantSlug,
        $this->testTenantAdmin->id,
        $this->testDistritoId,
    );

    $this->actingAs($this->testTenantAdmin);

    $this->post(
        'http://'.$this->testTenantHost.'/taller/ordenes-trabajo/'.$ordenId.'/cobrar',
        [
            'lineas' => [
                ['concepto' => 'Alineamiento', 'cantidad' => 1, 'precio_unitario' => 80],
            ],
            'pagos' => [
                ['metodo' => 'efectivo', 'monto' => 80, 'monto_recibido' => 80],
            ],
            'tipo_comprobante_sunat' => 2,
        ],
    )->assertRedirect();

    $list = $this->get('http://'.$this->testTenantHost.'/facturacion/documentos');
    $list->assertOk();
    $list->assertInertia(fn ($page) => $page
        ->component('facturacion/documentos/index')
        ->has('documentos.data', 1)
        ->where('fel_ready', true)
    );

    $settings = $this->get('http://'.$this->testTenantHost.'/configuracion/general');
    $settings->assertOk();
    $settings->assertInertia(fn ($page) => $page
        ->component('configuracion/general/index')
        ->where('setting.apisunat_configurado', true)
        ->where('setting.emite_comprobantes_sunat', true)
        ->missing('setting.apisunat_token')
        ->missing('setting.apisunat_token_enc')
    );
});

it('crea series B001 y F001 al registrar una sede', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $this->post('http://'.$this->testTenantHost.'/configuracion/sedes', [
        'nombre' => 'Sede FEL',
        'direccion' => 'Av. Arequipa 100',
        'distrito_id' => $this->testDistritoId,
        'activa' => true,
    ])->assertSessionHasNoErrors();

    $sede = Sede::query()->where('tenant_id', $this->testTenant->id)->first();
    expect($sede)->not->toBeNull();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede): void {
        $series = FelSerie::query()->where('sede_id', $sede->id)->orderBy('tipo_comprobante')->get();
        expect($series)->toHaveCount(2)
            ->and($series->pluck('serie')->all())->toBe(['F001', 'B001']);
    });
});
