<?php

declare(strict_types=1);

use App\Models\Cita;
use App\Models\Cliente;
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
        $this->markTestSkipped('El dashboard del taller vive en el schema del tenant (requiere PostgreSQL).');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
    $this->seedGeoCatalog();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('muestra las citas de hoy en el dashboard del taller', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    TenantContext::runForSlug($this->testTenantSlug, function () use ($sede): void {
        $cliente = Cliente::factory()->create();
        $vehiculo = Vehiculo::factory()->create(['cliente_id' => $cliente->id]);
        Cita::factory()->create([
            'sede_id' => $sede->id,
            'cliente_id' => $cliente->id,
            'vehiculo_id' => $vehiculo->id,
            'inicia_at' => now('America/Lima'),
            'motivo' => 'Alineación',
        ]);
    });

    $this->actingAs($this->testTenantAdmin);

    $this->get('http://'.$this->testTenantHost.'/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/index')
            ->where('kpis.citas_hoy', 1)
            ->where('kpis.citas_pendientes_hoy', 1)
            ->has('citas_hoy', 1)
            ->where('citas_hoy.0.motivo', 'Alineación')
            ->has('kpis.ot_abiertas')
            ->has('kpis.ventas_hoy_total')
            ->has('onboarding')
            ->where('onboarding.show', true)
            ->where('onboarding.completed', false)
            ->where('onboarding.total_steps', 5)
            ->where('onboarding.completed_steps', 3)
        );
});
