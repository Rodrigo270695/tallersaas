<?php

declare(strict_types=1);

use App\Services\Integrations\ApiPeruDniService;
use App\Services\Integrations\ApiPeruRucService;
use App\Services\Integrations\ApisunatLookupService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    Cache::flush();

    config([
        'services.apiperu.token' => 'apiperu-token',
        'services.apiperu.base_url' => 'https://apiperu.dev/api',
        'services.apisunat_lookup.token' => 'lucode-token',
        'services.apisunat_lookup.base_url' => 'https://dev.apisunat.pe/api/v1',
    ]);
});

it('usa apiperu.dev cuando responde correctamente', function (): void {
    Http::fake([
        'https://apiperu.dev/api/dni' => Http::response([
            'success' => true,
            'data' => [
                'dni' => '12345678',
                'nombres' => 'JUAN CARLOS',
                'apellido_paterno' => 'PEREZ',
                'apellido_materno' => 'GARCIA',
                'nombre_completo' => 'PEREZ GARCIA JUAN CARLOS',
            ],
        ], 200),
    ]);

    $result = app(ApiPeruDniService::class)->consultar('12345678');

    expect($result['dni'])->toBe('12345678')
        ->and($result['nombres'])->toBe('JUAN CARLOS')
        ->and($result['apellidos'])->toBe('PEREZ GARCIA');

    Http::assertSent(fn (Request $request): bool => $request->url() === 'https://apiperu.dev/api/dni');
});

it('cae a APISUNAT cuando apiperu.dev responde 429', function (): void {
    Http::fake([
        'https://apiperu.dev/api/dni' => Http::response(['message' => 'Too Many Requests'], 429),
        'https://dev.apisunat.pe/api/v1/person/dni/12345678' => Http::response([
            'success' => true,
            'payload' => [
                'dni' => '12345678',
                'nombres' => 'JUAN CARLOS',
                'apellido_paterno' => 'PEREZ',
                'apellido_materno' => 'GARCIA',
                'nombre_completo' => 'PEREZ GARCIA JUAN CARLOS',
            ],
        ], 200),
    ]);

    $result = app(ApiPeruDniService::class)->consultar('12345678');

    expect($result['dni'])->toBe('12345678')
        ->and($result['nombres'])->toBe('JUAN CARLOS')
        ->and($result['apellidos'])->toBe('PEREZ GARCIA');
});

it('cae a APISUNAT cuando apiperu.dev hace timeout', function (): void {
    Http::fake(function (Request $request) {
        if (str_contains($request->url(), 'apiperu.dev')) {
            throw new ConnectionException('cURL error 28: Connection timed out');
        }

        return Http::response([
            'success' => true,
            'payload' => [
                'ruc' => '20553300429',
                'razon_social' => 'EMPRESA DEMO S.A.C.',
                'estado' => 'ACTIVO',
                'condicion' => 'HABIDO',
                'direccion_fiscal' => 'AV. DEMO 123',
            ],
        ], 200);
    });

    $result = app(ApiPeruRucService::class)->consultar('20553300429');

    expect($result['razon_social'])->toBe('EMPRESA DEMO S.A.C.')
        ->and($result['direccion'])->toBe('AV. DEMO 123');
});

it('no cae a APISUNAT si el token de respaldo no está configurado', function (): void {
    config(['services.apisunat_lookup.token' => null]);

    Http::fake([
        'https://apiperu.dev/api/ruc' => Http::response(['message' => 'Too Many Requests'], 429),
    ]);

    expect(fn () => app(ApiPeruRucService::class)->consultar('20553300429'))
        ->toThrow(RuntimeException::class);
});

it('ApisunatLookupService parsea correctamente una respuesta de RUC', function (): void {
    Http::fake([
        'https://dev.apisunat.pe/api/v1/business/ruc/20553300429' => Http::response([
            'success' => true,
            'payload' => [
                'ruc' => '20553300429',
                'razon_social' => 'EMPRESA DEMO S.A.C.',
                'estado' => 'ACTIVO',
                'condicion' => 'HABIDO',
                'direccion_fiscal' => 'AV. DEMO 123',
            ],
        ], 200),
    ]);

    $result = app(ApisunatLookupService::class)->consultarRuc('20553300429');

    expect($result['razon_social'])->toBe('EMPRESA DEMO S.A.C.')
        ->and($result['direccion'])->toBe('AV. DEMO 123')
        ->and($result['estado_sunat'])->toBe('ACTIVO');
});
