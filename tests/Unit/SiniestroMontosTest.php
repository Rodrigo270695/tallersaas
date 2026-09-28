<?php

declare(strict_types=1);

use App\Services\Taller\SiniestroMontos;

it('reparte el siniestro según el porcentaje de cobertura', function (): void {
    $montos = SiniestroMontos::split(1000, 80, null, null);

    expect($montos)->toMatchArray([
        'monto_reclamado' => '1000.00',
        'monto_seguro' => '800.00',
        'monto_cliente' => '200.00',
        'cobertura_pct' => '80.00',
    ]);
});

it('calcula lo que paga el cliente cuando no hay porcentaje', function (): void {
    $montos = SiniestroMontos::split('450.50', null, '300', null);

    expect($montos['monto_seguro'])->toBe('300.00')
        ->and($montos['monto_cliente'])->toBe('150.50')
        ->and($montos['cobertura_pct'])->toBeNull();
});

it('no deja que el seguro supere lo reclamado', function (): void {
    $montos = SiniestroMontos::split(100, null, 250, 10);

    expect($montos['monto_seguro'])->toBe('100.00')
        ->and($montos['monto_cliente'])->toBe('10.00');
});
