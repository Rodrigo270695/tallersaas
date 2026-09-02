<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;
use Tests\Support\SeedsGeoCatalog;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class, SeedsGeoCatalog::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('La cola de WhatsApp vive en el schema del tenant (requiere PostgreSQL).');
    }

    $this->configureTenancyForTests();
    $this->seedPermissionsAndRoles();
    $this->createTestTenantWithSchema();
    $this->seedGeoCatalog();
});

afterEach(function (): void {
    $this->tearDownTestTenant();
});

it('muestra la cola saliente del taller', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->get('http://'.$this->testTenantHost.'/comunicaciones/cola');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('comunicaciones/cola/index')
        ->has('items')
        ->has('whatsapp')
        ->where('whatsapp.configured', false)
    );
});

it('muestra el histórico de WhatsApp', function (): void {
    $this->actingAs($this->testTenantAdmin);

    $response = $this->get('http://'.$this->testTenantHost.'/comunicaciones/historico');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('comunicaciones/historico/index')
        ->has('items')
    );
});
