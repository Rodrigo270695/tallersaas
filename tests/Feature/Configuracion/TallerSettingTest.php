<?php

declare(strict_types=1);

use App\Models\TallerSetting;
use App\Tenancy\Facades\Tenant as TenantContext;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;
use Tests\Support\SeedsGeoCatalog;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class, SeedsGeoCatalog::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('La configuración general vive en el schema del tenant (requiere PostgreSQL).');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
    $this->seedGeoCatalog();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('muestra la configuración general del taller', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->get('http://'.$this->testTenantHost.'/configuracion/general');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('configuracion/general/index')
        ->has('setting')
        ->has('departamentos')
    );
});

it('actualiza identidad fiscal y ubigeo', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->put('http://'.$this->testTenantHost.'/configuracion/general', [
        'ruc' => '20123456789',
        'razon_social' => 'Taller Demo S.A.C.',
        'nombre_comercial' => 'Taller Demo',
        'direccion_fiscal' => 'Av. Principal 100',
        'distrito_id' => $this->testDistritoId,
        'moneda' => 'PEN',
        'igv_porcentaje' => 18,
        'precio_incluye_igv' => true,
        'color_primario' => '#EA580C',
        'color_secundario' => '#FDBA74',
        'email_institucional' => 'contacto@taller.test',
        'telefono_principal' => '987654321',
        'web_url' => 'https://taller.test',
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        $setting = TallerSetting::current();
        expect($setting->ruc)->toBe('20123456789')
            ->and($setting->razon_social)->toBe('Taller Demo S.A.C.')
            ->and($setting->distrito_id)->toBe($this->testDistritoId)
            ->and($setting->color_primario)->toBe('#EA580C');
    });
});
