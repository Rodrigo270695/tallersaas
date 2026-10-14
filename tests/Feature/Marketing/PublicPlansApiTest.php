<?php

declare(strict_types=1);

use App\Models\Plan;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('Los planes viven en el schema public de PostgreSQL.');
    }

    $this->configureTenancyForTests();

    $this->publico = Plan::query()->create([
        'codigo' => 'mkt_pro_test',
        'nombre' => 'Pro Test',
        'descripcion' => 'Plan público de prueba',
        'precio_mensual' => 129.90,
        'precio_anual' => 1299,
        'trial_days' => 7,
        'orden' => 900,
        'es_publico' => true,
        'activo' => true,
    ]);
    $this->publico->features()->createMany([
        ['feature' => 'max_sedes', 'valor_int' => 2],
        ['feature' => 'max_usuarios', 'valor_int' => -1],
        ['feature' => 'facturas_electronicas', 'valor_bool' => true],
    ]);

    $this->privado = Plan::query()->create([
        'codigo' => 'mkt_privado_test',
        'nombre' => 'Privado Test',
        'precio_mensual' => 10,
        'trial_days' => 0,
        'orden' => 901,
        'es_publico' => false,
        'activo' => true,
    ]);
});

afterEach(function (): void {
    Plan::query()->whereIn('codigo', ['mkt_pro_test', 'mkt_privado_test'])->get()->each(function (Plan $plan): void {
        $plan->features()->delete();
        $plan->delete();
    });
});

it('expone solo planes públicos y activos con sus features resueltos', function (): void {
    $response = $this->getJson('http://localhost/api/public/tallersaas/plans');

    $response->assertOk();

    $plans = collect($response->json('plans'))->keyBy('codigo');
    expect($plans->has('mkt_privado_test'))->toBeFalse();

    $pro = $plans->get('mkt_pro_test');
    expect($pro['trial_days'])->toBe(7)
        ->and($pro['features']['max_sedes'])->toBe(2)
        ->and($pro['features']['max_usuarios'])->toBe(-1)
        ->and($pro['features']['facturas_electronicas'])->toBeTrue()
        ->and($pro['features']['guias_remision'])->toBe(Plan::FEATURE_CATALOG['guias_remision']['default'])
        ->and($pro['features']['max_clientes'])->toBe(Plan::FEATURE_CATALOG['max_clientes']['default']);

    expect($response->json('feature_catalog.max_sedes.type'))->toBe('int');
});

it('avisa a Orvae firmado cuando se guardan los features de un plan', function (): void {
    config([
        'orvae.marketing.refresh_url' => 'https://orvae.test/api/internal/tallersaas/marketing/refresh',
        'orvae.provision.hmac_secret' => 'secreto-compartido',
    ]);
    Http::fake(['orvae.test/*' => Http::response(['ok' => true])]);

    $this->seedPermissionsAndRoles();
    $this->actingAs($this->createTestSuperadmin());

    $this->put('http://localhost/plataforma/planes/'.$this->publico->id.'/features', [
        'features' => [
            ['feature' => 'max_sedes', 'valor_int' => 3],
        ],
    ])->assertSessionHasNoErrors();

    Http::assertSent(function (HttpRequest $request): bool {
        $timestamp = $request->header('X-Orvae-Timestamp')[0] ?? '';
        $expected = 'sha256='.hash_hmac('sha256', $timestamp.'.'.$request->body(), 'secreto-compartido');

        return $request->url() === 'https://orvae.test/api/internal/tallersaas/marketing/refresh'
            && ($request->header('X-Orvae-Signature')[0] ?? '') === $expected
            && $request['evento'] === 'plans.updated';
    });
});
