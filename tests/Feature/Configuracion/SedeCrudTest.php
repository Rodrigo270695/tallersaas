<?php

declare(strict_types=1);

use App\Models\Sede;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;
use Tests\Support\SeedsGeoCatalog;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class, SeedsGeoCatalog::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('El CRUD de sedes requiere PostgreSQL.');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
    $this->seedGeoCatalog();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('lista las sedes del tenant y el catálogo de departamentos', function (): void {
    Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'nombre' => 'Sede Norte',
        'distrito_id' => $this->testDistritoId,
        'distrito' => 'LINCE',
        'provincia' => 'LIMA',
        'departamento' => 'LIMA',
    ]);

    $this->actingAs($this->testTenantAdmin);

    $response = $this->get('http://'.$this->testTenantHost.'/configuracion/sedes');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('configuracion/sedes/index')
        ->has('sedes.data', 1)
        ->has('departamentos')
    );
});

it('crea una sede hidratando distrito provincia y departamento', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/configuracion/sedes', [
        'nombre' => 'Sede Principal',
        'direccion' => 'Av. Arequipa 100',
        'telefono' => '987654321',
        'email' => 'sede@taller.test',
        'distrito_id' => $this->testDistritoId,
        'activa' => true,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $sede = Sede::query()->where('tenant_id', $this->testTenant->id)->first();
    expect($sede)->not->toBeNull()
        ->and($sede->codigo)->toBe('SEDE-001')
        ->and($sede->distrito)->toBe('LINCE')
        ->and($sede->provincia)->toBe('LIMA')
        ->and($sede->departamento)->toBe('LIMA');
});

it('exige el distrito al crear una sede', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/configuracion/sedes', [
        'nombre' => 'Sede sin ubicación',
        'activa' => true,
    ]);

    $response->assertSessionHasErrors(['distrito_id']);
});

it('actualiza una sede existente', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'nombre' => 'Original',
        'distrito_id' => $this->testDistritoId,
    ]);

    $this->actingAs($this->testTenantAdmin);

    $response = $this->put('http://'.$this->testTenantHost.'/configuracion/sedes/'.$sede->id, [
        'nombre' => 'Sede actualizada',
        'direccion' => 'Calle 2',
        'distrito_id' => $this->testDistritoId,
        'activa' => false,
    ]);

    $response->assertSessionHasNoErrors();
    expect($sede->fresh()->nombre)->toBe('Sede actualizada')
        ->and($sede->fresh()->activa)->toBeFalse();
});

it('elimina una sede', function (): void {
    $sede = Sede::factory()->create([
        'tenant_id' => $this->testTenant->id,
        'distrito_id' => $this->testDistritoId,
    ]);

    $this->actingAs($this->testTenantAdmin);

    $response = $this->delete('http://'.$this->testTenantHost.'/configuracion/sedes/'.$sede->id);

    $response->assertRedirect();
    expect(Sede::query()->whereKey($sede->id)->exists())->toBeFalse();
});
