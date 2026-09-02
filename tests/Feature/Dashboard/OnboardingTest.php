<?php

declare(strict_types=1);

use App\Models\CajaSesion;
use App\Models\Cita;
use App\Models\Cliente;
use App\Models\OrdenTrabajo;
use App\Models\Sede;
use App\Models\TallerSetting;
use App\Models\Vehiculo;
use App\Models\Venta;
use App\Services\Onboarding\TallerOnboardingService;
use App\Tenancy\Facades\Tenant as TenantContext;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;
use Tests\Support\SeedsGeoCatalog;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class, SeedsGeoCatalog::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('El onboarding del taller vive en el schema del tenant (requiere PostgreSQL).');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
    $this->seedGeoCatalog();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('muestra el checklist y bloquea los pasos posteriores si no hay sede', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $this->get('http://'.$this->testTenantHost.'/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/index')
            ->where('onboarding.show', true)
            ->where('onboarding.completed', false)
            ->where('onboarding.completed_steps', 0)
            ->where('onboarding.steps.0.id', 'sede')
            ->where('onboarding.steps.0.current', true)
            ->where('onboarding.steps.0.locked', false)
            ->where('onboarding.steps.1.locked', true)
            ->where('onboarding.steps.1.href', null)
            ->where('onboarding.steps.4.locked', true)
        );

    $this->testTenant->refresh();
    expect($this->testTenant->onboarding_paso)->toBe(TallerOnboardingService::STEP_SEDE)
        ->and($this->testTenant->onboarding_completado)->toBeFalse();
});

it('desbloquea los pasos al crear la primera sede y avanza al perfil fiscal', function (): void {
    Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $this->actingAs($this->testTenantAdmin);

    $this->get('http://'.$this->testTenantHost.'/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('onboarding.show', true)
            ->where('onboarding.completed_steps', 1)
            ->where('onboarding.steps.0.completed', true)
            ->where('onboarding.steps.1.locked', false)
            ->where('onboarding.steps.1.current', true)
            ->where('onboarding.steps.1.href', '/configuracion/general')
        );
});

it('marca el onboarding como completo cuando existen los cinco criterios', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede): void {
        TallerSetting::current()->update([
            'ruc' => '20123456789',
            'razon_social' => 'Taller Test S.A.C.',
            'nombre_comercial' => 'Taller Test',
        ]);

        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        Cita::factory()->create([
            'sede_id' => $sede->id,
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'inicia_at' => now('America/Lima'),
        ]);

        $sesion = CajaSesion::query()->create([
            'sede_id' => $sede->id,
            'estado' => CajaSesion::ESTADO_ABIERTA,
            'moneda' => 'PEN',
            'saldo_apertura' => 0,
            'opened_at' => now(),
            'opened_by_id' => $this->testTenantAdmin->id,
        ]);

        $orden = OrdenTrabajo::query()->create([
            'sede_id' => $sede->id,
            'numero' => OrdenTrabajo::generateNextNumber(),
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'estado' => OrdenTrabajo::ESTADO_ABIERTA,
            'ingreso_at' => now(),
        ]);

        Venta::query()->create([
            'numero' => Venta::generateNextNumber(),
            'sede_id' => $sede->id,
            'caja_sesion_id' => $sesion->id,
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'orden_trabajo_id' => $orden->id,
            'moneda' => 'PEN',
            'estado' => Venta::ESTADO_PAGADO,
            'subtotal' => 80,
            'igv_monto' => 0,
            'descuento_monto' => 0,
            'total' => 80,
            'metodo_pago' => 'efectivo',
            'fecha_pago' => now(),
            'created_by_id' => $this->testTenantAdmin->id,
        ]);
    });

    $this->actingAs($this->testTenantAdmin);

    $this->get('http://'.$this->testTenantHost.'/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('onboarding.show', false)
            ->where('onboarding.completed', true)
            ->where('onboarding.completed_steps', 5)
        );

    $this->testTenant->refresh();
    expect($this->testTenant->onboarding_completado)->toBeTrue()
        ->and($this->testTenant->onboarding_paso)->toBe(TallerOnboardingService::STEP_VENTA);
});

it('muestra el checklist en modo vista previa aunque ya esté completado', function (): void {
    $this->testTenant->forceFill([
        'onboarding_completado' => true,
        'onboarding_paso' => TallerOnboardingService::STEP_VENTA,
    ])->save();

    $this->actingAs($this->testTenantAdmin);

    $this->get('http://'.$this->testTenantHost.'/dashboard?onboarding_preview=1')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('onboarding.show', true)
            ->where('onboarding.preview', true)
            ->where('onboarding.completed', true)
        );
});

it('oculta el checklist si el onboarding está desactivado', function (): void {
    config(['onboarding.enabled' => false]);

    $this->actingAs($this->testTenantAdmin);

    $this->get('http://'.$this->testTenantHost.'/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('onboarding.show', false)
        );
});

it('reinicia el checklist con tallersaas:onboarding-reset', function (): void {
    $this->testTenant->forceFill([
        'onboarding_completado' => true,
        'onboarding_paso' => TallerOnboardingService::STEP_VENTA,
    ])->save();

    $this->artisan('tallersaas:onboarding-reset', ['slug' => $this->testTenantSlug])
        ->assertSuccessful();

    $this->testTenant->refresh();
    expect($this->testTenant->onboarding_completado)->toBeFalse()
        ->and($this->testTenant->onboarding_paso)->toBe(0);
});
