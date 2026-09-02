<?php

declare(strict_types=1);

use App\Models\Plan;
use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('El panel de plataforma se prueba contra PostgreSQL.');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('lista los talleres en el panel central', function (): void {
    $superadmin = $this->createTestSuperadmin();
    $this->actingAs($superadmin);

    $response = $this->get('http://localhost/plataforma/tenants');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('plataforma/tenants/index')
        ->has('tenants.data')
        ->has('plans_catalog')
    );
});

it('suspende un taller desde el panel', function (): void {
    $superadmin = $this->createTestSuperadmin();
    $this->actingAs($superadmin);

    $response = $this->post(
        'http://localhost/plataforma/tenants/'.$this->testTenant->id.'/suspend',
        ['reason' => 'Falta de pago del periodo'],
    );

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    expect(Tenant::query()->find($this->testTenant->id)?->estado)->toBe('suspended');
});

it('crea un plan desde el panel', function (): void {
    $superadmin = $this->createTestSuperadmin();
    $this->actingAs($superadmin);

    $response = $this->post('http://localhost/plataforma/planes', [
        'codigo' => 'pro_test',
        'nombre' => 'Pro Test',
        'descripcion' => 'Plan de prueba',
        'precio_mensual' => 99,
        'trial_days' => 7,
        'orden' => 10,
        'es_publico' => true,
        'activo' => true,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    expect(Plan::query()->where('codigo', 'pro_test')->exists())->toBeTrue();
});
