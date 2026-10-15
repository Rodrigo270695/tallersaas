<?php

declare(strict_types=1);

use App\Models\Plan;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesTestTenant;
use Tests\Support\RefreshDatabaseWithPgsqlSafety;

uses(RefreshDatabaseWithPgsqlSafety::class, CreatesTestTenant::class);

beforeEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('Los planes viven en el schema public de PostgreSQL.');
    }

    $this->configureTenancyForTests();
    config(['orvae.provision.hmac_secret' => 'test-knowledge-secret']);

    $plan = Plan::query()->create([
        'codigo' => 'kn_pro_test',
        'nombre' => 'Pro Test',
        'descripcion' => 'Plan público de prueba',
        'precio_mensual' => 129.90,
        'precio_anual' => 1299,
        'trial_days' => 7,
        'orden' => 900,
        'es_publico' => true,
        'activo' => true,
    ]);
    $plan->features()->createMany([
        ['feature' => 'max_sedes', 'valor_int' => 1],
        ['feature' => 'max_usuarios', 'valor_int' => -1],
        ['feature' => 'boletas_electronicas', 'valor_bool' => true],
        ['feature' => 'max_comprobantes_mes', 'valor_int' => 200],
    ]);
});

afterEach(function (): void {
    if (DB::getDriverName() !== 'pgsql') {
        return;
    }

    Plan::query()->where('codigo', 'kn_pro_test')->get()->each(function (Plan $plan): void {
        $plan->features()->delete();
        $plan->delete();
    });
});

it('entrega a ORVAE planes con lo que incluyen, módulos, FAQ y demo', function (): void {
    $timestamp = (string) time();

    $response = $this->call('GET', 'http://localhost/api/internal/saas/salesbot-knowledge', server: [
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_X_ORVAE_TIMESTAMP' => $timestamp,
        'HTTP_X_ORVAE_SIGNATURE' => 'sha256='.hash_hmac('sha256', $timestamp.'.', 'test-knowledge-secret'),
        'HTTP_X_IDEMPOTENCY_KEY' => 'test:knowledge',
    ]);

    $response->assertOk()
        ->assertJsonPath('version', 1)
        ->assertJsonPath('producto', 'tallersaas')
        ->assertJsonPath('demo.url', config('salesbot_knowledge.demo.url'));

    $plan = collect($response->json('planes'))->firstWhere('codigo', 'kn_pro_test');
    expect($plan['precio_mensual'])->toBe(129.9)
        ->and($plan['incluye'])->toContain('1 sede', 'Sin límite de usuarios', 'Facturación electrónica SUNAT: boletas (hasta 200 comprobantes/mes)')
        ->and(collect($response->json('secciones'))->pluck('tipo')->unique()->values()->all())->toContain('modulo', 'faq');
});
