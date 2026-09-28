<?php

use App\Services\Ai\CatalogoLineas;
use App\Services\Ai\OpenAiClient;
use App\Services\Ai\OpenAiException;
use Illuminate\Support\Facades\Http;

it('usa el precio del catalogo y marca comprar cuando no alcanza el stock', function () {
    $servicios = [
        'srv-1' => ['nombre' => 'Cambio de pastillas', 'precio' => '80.00'],
    ];
    $productos = [
        'prd-1' => ['nombre' => 'Aceite 5W30', 'precio' => '45.00', 'stock' => '0'],
        'prd-2' => ['nombre' => 'Filtro de aceite', 'precio' => '25.00', 'stock' => '4'],
    ];

    $lineas = CatalogoLineas::materializar([
        ['tipo' => 'servicio', 'catalogo_id' => 'srv-1', 'descripcion' => 'inventado', 'cantidad' => 1],
        ['tipo' => 'producto', 'catalogo_id' => 'prd-1', 'descripcion' => 'inventado', 'cantidad' => 1],
        ['tipo' => 'producto', 'catalogo_id' => 'prd-2', 'descripcion' => 'inventado', 'cantidad' => 1],
        ['tipo' => 'otro', 'catalogo_id' => '', 'descripcion' => 'Disco rayado', 'cantidad' => 2],
        ['tipo' => 'producto', 'catalogo_id' => 'no-existe', 'descripcion' => '', 'cantidad' => 1],
    ], $servicios, $productos);

    expect($lineas)->toHaveCount(4)
        ->and($lineas[0]['servicio_id'])->toBe('srv-1')
        ->and($lineas[0]['precio_unitario'])->toBe('80.00')
        ->and($lineas[0]['descripcion'])->toBe('Cambio de pastillas')
        ->and($lineas[1]['comprar'])->toBeTrue()
        ->and($lineas[1]['descripcion'])->toContain('comprar')
        ->and($lineas[2]['comprar'])->toBeFalse()
        ->and($lineas[2]['precio_unitario'])->toBe('25.00')
        ->and($lineas[3]['producto_id'])->toBe('')
        ->and($lineas[3]['precio_unitario'])->toBe('0.00');
});

it('en repuestos ignora servicios y pide comprar lo que no esta en catalogo', function () {
    $lineas = CatalogoLineas::materializar([
        ['tipo' => 'servicio', 'catalogo_id' => 'srv-1', 'descripcion' => 'Mano de obra', 'cantidad' => 1],
        ['tipo' => 'otro', 'catalogo_id' => '', 'descripcion' => 'Sensor ABS', 'cantidad' => 1],
    ], [
        'srv-1' => ['nombre' => 'Mano de obra', 'precio' => '50.00'],
    ], [], soloProductos: true);

    expect($lineas)->toHaveCount(1)
        ->and($lineas[0]['descripcion'])->toContain('Sensor ABS')
        ->and($lineas[0]['comprar'])->toBeTrue();
});

it('avisa si falta la clave de OpenAI', function () {
    config(['services.openai.key' => null]);

    expect(fn () => app(OpenAiClient::class)->json('sistema', 'hola', [
        'type' => 'object',
        'additionalProperties' => false,
        'properties' => ['ok' => ['type' => 'string']],
        'required' => ['ok'],
    ], 'prueba'))->toThrow(OpenAiException::class, 'OPENAI_API_KEY');
});

it('lee el json que devuelve OpenAI', function () {
    config([
        'services.openai.key' => 'test-key',
        'services.openai.model' => 'gpt-4.1-mini',
    ]);

    Http::fake([
        'https://api.openai.com/v1/chat/completions' => Http::response([
            'choices' => [
                ['message' => ['content' => '{"diagnostico":"Cambio de aceite","lineas":[]}']],
            ],
        ]),
    ]);

    $decoded = app(OpenAiClient::class)->json('sistema', 'aceite', [
        'type' => 'object',
        'additionalProperties' => false,
        'properties' => [
            'diagnostico' => ['type' => 'string'],
            'lineas' => ['type' => 'array', 'items' => ['type' => 'string']],
        ],
        'required' => ['diagnostico', 'lineas'],
    ], 'presupuesto_taller');

    expect($decoded['diagnostico'])->toBe('Cambio de aceite');

    Http::assertSent(function ($request): bool {
        return $request['model'] === 'gpt-4.1-mini'
            && $request->hasHeader('Authorization', 'Bearer test-key');
    });
});
