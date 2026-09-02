<?php

declare(strict_types=1);

use App\Models\Cliente;
use App\Models\User;
use App\Tenancy\Facades\Tenant as TenantContext;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('El CRUD de clientes vive en el schema del tenant (requiere PostgreSQL).');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('lista los clientes del tenant', function (): void {
    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        Cliente::factory()->count(3)->create();
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->get('http://'.$this->testTenantHost.'/taller/clientes');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('taller/clientes/index')
        ->has('clientes.data', 3)
    );
});

it('crea un cliente nuevo', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/clientes', [
        'nombres' => 'Juan Carlos',
        'apellidos' => 'Pérez García',
        'tipo_documento' => 'DNI',
        'numero_documento' => '12345678',
        'telefono' => '987654321',
        'email' => 'juan@example.com',
        'direccion' => 'Av. Los Talleres 123',
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        expect(Cliente::query()->where('numero_documento', '12345678')->exists())->toBeTrue();
    });
});

it('valida los campos requeridos al crear un cliente', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/clientes', [
        'nombres' => '',
    ]);

    $response->assertSessionHasErrors(['nombres']);
});

it('rechaza un DNI que no tiene exactamente 8 dígitos', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/clientes', [
        'nombres' => 'Cliente Prueba',
        'tipo_documento' => 'DNI',
        'numero_documento' => '123456',
    ]);

    $response->assertSessionHasErrors(['numero_documento']);
});

it('rechaza un RUC que no tiene exactamente 11 dígitos', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/clientes', [
        'nombres' => 'Empresa Prueba S.A.C.',
        'tipo_documento' => 'RUC',
        'numero_documento' => '2010007097',
    ]);

    $response->assertSessionHasErrors(['numero_documento']);
});

it('acepta un carné de extranjería sin exigir una cantidad exacta de dígitos', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/clientes', [
        'nombres' => 'Cliente Extranjero',
        'tipo_documento' => 'CE',
        'numero_documento' => 'CE1234',
    ]);

    $response->assertSessionHasNoErrors();
});

it('crea un cliente inactivo cuando se envía activo en false', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/clientes', [
        'nombres' => 'Cliente Inactivo',
        'tipo_documento' => 'DNI',
        'numero_documento' => '11223344',
        'activo' => false,
    ]);

    $response->assertSessionHasNoErrors();

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        $cliente = Cliente::query()->where('numero_documento', '11223344')->first();
        expect($cliente->activo)->toBeFalse();
    });
});

it('un cliente nuevo queda activo por defecto', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->post('http://'.$this->testTenantHost.'/taller/clientes', [
        'nombres' => 'Cliente Por Defecto',
        'tipo_documento' => 'DNI',
        'numero_documento' => '55667788',
    ]);

    $response->assertSessionHasNoErrors();

    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        $cliente = Cliente::query()->where('numero_documento', '55667788')->first();
        expect($cliente->activo)->toBeTrue();
    });
});

it('permite desactivar un cliente existente al editarlo', function (): void {
    $clienteId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$clienteId): void {
        $cliente = Cliente::factory()->create(['activo' => true]);
        $clienteId = $cliente->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->put('http://'.$this->testTenantHost.'/taller/clientes/'.$clienteId, [
        'nombres' => 'Cliente Editado',
        'tipo_documento' => 'DNI',
        'numero_documento' => '99887766',
        'activo' => false,
    ]);

    $response->assertSessionHasNoErrors();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($clienteId): void {
        expect(Cliente::query()->find($clienteId)->activo)->toBeFalse();
    });
});

it('actualiza un cliente existente', function (): void {
    $clienteId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$clienteId): void {
        $cliente = Cliente::factory()->create(['nombres' => 'Original']);
        $clienteId = $cliente->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->put('http://'.$this->testTenantHost.'/taller/clientes/'.$clienteId, [
        'nombres' => 'Actualizado',
        'apellidos' => 'Apellido',
        'tipo_documento' => 'DNI',
        'numero_documento' => '87654321',
        'telefono' => null,
        'email' => null,
        'direccion' => null,
    ]);

    $response->assertSessionHasNoErrors();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($clienteId): void {
        expect(Cliente::query()->find($clienteId)->nombres)->toBe('Actualizado');
    });
});

it('elimina (soft delete) un cliente', function (): void {
    $clienteId = null;

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$clienteId): void {
        $cliente = Cliente::factory()->create();
        $clienteId = $cliente->id;
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->delete('http://'.$this->testTenantHost.'/taller/clientes/'.$clienteId);

    $response->assertSessionHasNoErrors();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($clienteId): void {
        expect(Cliente::query()->find($clienteId))->toBeNull();
        expect(Cliente::withTrashed()->find($clienteId))->not->toBeNull();
    });
});

it('elimina varios clientes en bloque', function (): void {
    $ids = [];

    TenantContext::runForSlug($this->testTenantSlug, function () use (&$ids): void {
        $ids = Cliente::factory()->count(2)->create()->pluck('id')->all();
    });

    $this->actingAs($this->testTenantAdmin);

    $response = $this->delete('http://'.$this->testTenantHost.'/taller/clientes-bulk', [
        'ids' => $ids,
    ]);

    $response->assertSessionHasNoErrors();

    TenantContext::runForSlug($this->testTenantSlug, function () use ($ids): void {
        expect(Cliente::query()->whereIn('id', $ids)->count())->toBe(0);
    });
});

it('rechaza el acceso a un usuario sin el permiso requerido', function (): void {
    TenantContext::runForSlug($this->testTenantSlug, function (): void {
        // Nada que preparar: el usuario `mecanico` no tiene permiso de creación.
    });

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

    $response = $this->post('http://'.$this->testTenantHost.'/taller/clientes', [
        'nombres' => 'Intento no autorizado',
    ]);

    $response->assertForbidden();
});
