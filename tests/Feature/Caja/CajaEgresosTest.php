<?php

declare(strict_types=1);

use App\Models\CajaEgreso;
use App\Models\CajaSesion;
use App\Models\Sede;
use App\Models\User;
use App\Tenancy\Facades\Tenant as TenantContext;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;
use Tests\Support\SeedsGeoCatalog;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class, SeedsGeoCatalog::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('Los egresos de caja viven en el schema del tenant (requiere PostgreSQL).');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
    $this->seedGeoCatalog();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

function abrirSesionDePrueba(
    string $tenantId,
    string $tenantSlug,
    int $distritoId,
    string $openedById,
    string $estado = CajaSesion::ESTADO_ABIERTA,
): string {
    $sede = Sede::factory()->create([
        'tenant_id' => $tenantId,
        'distrito_id' => $distritoId,
    ]);

    $sesionId = null;

    TenantContext::runForSlug($tenantSlug, function () use ($sede, $openedById, $estado, &$sesionId): void {
        $sesionId = CajaSesion::query()->create([
            'sede_id' => $sede->id,
            'estado' => $estado,
            'moneda' => 'PEN',
            'saldo_apertura' => 100,
            'opened_at' => now(),
            'opened_by_id' => $openedById,
            'closed_at' => $estado === CajaSesion::ESTADO_CERRADA ? now() : null,
            'closed_by_id' => $estado === CajaSesion::ESTADO_CERRADA ? $openedById : null,
            'saldo_cierre_efectivo' => $estado === CajaSesion::ESTADO_CERRADA ? 100 : null,
        ])->id;
    });

    return (string) $sesionId;
}

it('registra un egreso en la sesión abierta del usuario', function (): void {
    $sesionId = abrirSesionDePrueba(
        (string) $this->testTenant->id,
        $this->testTenantSlug,
        $this->testDistritoId,
        $this->testTenantAdmin->id,
    );

    $this->actingAs($this->testTenantAdmin);

    $response = $this->from('http://'.$this->testTenantHost.'/caja/sesiones')
        ->post('http://'.$this->testTenantHost.'/caja/sesiones/'.$sesionId.'/egresos', [
            'monto' => 25.5,
            'motivo' => CajaEgreso::MOTIVO_INSUMOS,
            'descripcion' => 'Compra de tornillos',
        ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sesionId): void {
        $egreso = CajaEgreso::query()->first();
        expect($egreso)->not->toBeNull()
            ->and($egreso->caja_sesion_id)->toBe($sesionId)
            ->and((float) $egreso->monto)->toBe(25.5)
            ->and($egreso->motivo)->toBe(CajaEgreso::MOTIVO_INSUMOS)
            ->and($egreso->descripcion)->toBe('Compra de tornillos');
    });
});

it('incluye los egresos de mi sesión abierta en el listado de caja', function (): void {
    $sesionId = abrirSesionDePrueba(
        (string) $this->testTenant->id,
        $this->testTenantSlug,
        $this->testDistritoId,
        $this->testTenantAdmin->id,
    );

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sesionId): void {
        CajaEgreso::query()->create([
            'caja_sesion_id' => $sesionId,
            'monto' => 12.5,
            'motivo' => CajaEgreso::MOTIVO_CAMBIO,
            'descripcion' => 'Vuelto',
            'created_by_id' => $this->testTenantAdmin->id,
        ]);
    });

    $this->actingAs($this->testTenantAdmin);

    $this->get('http://'.$this->testTenantHost.'/caja/sesiones')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('caja/sesiones/index')
            ->has('mi_sesion_abierta.egresos', 1)
            ->where('mi_sesion_abierta.egresos_total', '12.50')
            ->where('mi_sesion_abierta.egresos.0.motivo_label', 'Cambio / vuelto')
        );
});

it('no permite registrar egresos en una sesión cerrada', function (): void {
    $sesionId = abrirSesionDePrueba(
        (string) $this->testTenant->id,
        $this->testTenantSlug,
        $this->testDistritoId,
        $this->testTenantAdmin->id,
        CajaSesion::ESTADO_CERRADA,
    );

    $this->actingAs($this->testTenantAdmin);

    $this->from('http://'.$this->testTenantHost.'/caja/sesiones')
        ->post('http://'.$this->testTenantHost.'/caja/sesiones/'.$sesionId.'/egresos', [
            'monto' => 10,
            'motivo' => CajaEgreso::MOTIVO_OTROS,
        ])
        ->assertSessionHasErrors('monto');

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        expect(CajaEgreso::query()->count())->toBe(0);
    });
});

it('no permite registrar egresos en la caja de otro usuario', function (): void {
    $previousTeam = getPermissionsTeamId();
    setPermissionsTeamId((string) $this->testTenant->id);

    $otro = User::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'is_active' => true,
        'email_verified_at' => now(),
    ]);
    $otro->assignRole('recepcionista');
    setPermissionsTeamId($previousTeam);

    $sesionId = abrirSesionDePrueba(
        (string) $this->testTenant->id,
        $this->testTenantSlug,
        $this->testDistritoId,
        $otro->id,
    );

    $this->actingAs($this->testTenantAdmin);

    $this->from('http://'.$this->testTenantHost.'/caja/sesiones')
        ->post('http://'.$this->testTenantHost.'/caja/sesiones/'.$sesionId.'/egresos', [
            'monto' => 10,
            'motivo' => CajaEgreso::MOTIVO_OTROS,
        ])
        ->assertSessionHasErrors('monto');
});

it('elimina un egreso de la sesión abierta', function (): void {
    $sesionId = abrirSesionDePrueba(
        (string) $this->testTenant->id,
        $this->testTenantSlug,
        $this->testDistritoId,
        $this->testTenantAdmin->id,
    );

    $egresoId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sesionId, &$egresoId): void {
        $egresoId = CajaEgreso::query()->create([
            'caja_sesion_id' => $sesionId,
            'monto' => 8,
            'motivo' => CajaEgreso::MOTIVO_DELIVERY,
            'created_by_id' => $this->testTenantAdmin->id,
        ])->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $this->from('http://'.$this->testTenantHost.'/caja/sesiones')
        ->delete('http://'.$this->testTenantHost.'/caja/sesiones/'.$sesionId.'/egresos/'.$egresoId)
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        expect(CajaEgreso::query()->count())->toBe(0);
    });
});

it('resta los egresos al cerrar la caja', function (): void {
    $sesionId = abrirSesionDePrueba(
        (string) $this->testTenant->id,
        $this->testTenantSlug,
        $this->testDistritoId,
        $this->testTenantAdmin->id,
    );

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sesionId): void {
        CajaEgreso::query()->create([
            'caja_sesion_id' => $sesionId,
            'monto' => 30,
            'motivo' => CajaEgreso::MOTIVO_SERVICIOS,
            'created_by_id' => $this->testTenantAdmin->id,
        ]);
    });

    $this->actingAs($this->testTenantAdmin);

    $this->from('http://'.$this->testTenantHost.'/caja/sesiones')
        ->post('http://'.$this->testTenantHost.'/caja/sesiones/'.$sesionId.'/cerrar', [
            'saldo_cierre_efectivo' => 70,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sesionId): void {
        $sesion = CajaSesion::query()->findOrFail($sesionId);
        expect($sesion->estado)->toBe(CajaSesion::ESTADO_CERRADA)
            ->and($sesion->arqueo_json['egresos'])->toBe('30.00')
            ->and($sesion->arqueo_json['efectivo_esperado'])->toBe('70.00')
            ->and($sesion->arqueo_json['diferencia'])->toBe('0.00');
    });
});

it('rechaza egresos a un usuario sin el permiso requerido', function (): void {
    $sesionId = abrirSesionDePrueba(
        (string) $this->testTenant->id,
        $this->testTenantSlug,
        $this->testDistritoId,
        $this->testTenantAdmin->id,
    );

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

    $this->post('http://'.$this->testTenantHost.'/caja/sesiones/'.$sesionId.'/egresos', [
        'monto' => 5,
        'motivo' => CajaEgreso::MOTIVO_OTROS,
    ])->assertForbidden();
});
