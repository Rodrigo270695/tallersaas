<?php

use App\Services\Ai\MantenimientoEstimador;
use Carbon\Carbon;

it('avisa el aceite cuando el auto ya recorrio su propio ritmo', function () {
    $alerta = (new MantenimientoEstimador)->evaluar('aceite', [
        ['at' => Carbon::parse('2026-03-01'), 'km' => 40000],
        ['at' => Carbon::parse('2026-06-01'), 'km' => 45000],
    ], 49800, Carbon::parse('2026-09-27'));

    expect($alerta)->not->toBeNull()
        ->and($alerta['etiqueta'])->toBe('cambio de aceite')
        ->and($alerta['km_restantes'])->toBe(200)
        ->and($alerta['atrasado'])->toBeTrue();
});

it('no avisa un aceite recien hecho', function () {
    $alerta = (new MantenimientoEstimador)->evaluar('aceite', [
        ['at' => Carbon::parse('2026-09-01'), 'km' => 10000],
    ], 11000, Carbon::parse('2026-09-27'));

    expect($alerta)->toBeNull();
});

it('clasifica aceite, revision y plumillas', function () {
    expect(MantenimientoEstimador::clasificar('Aceite 5W30'))->toBe('aceite')
        ->and(MantenimientoEstimador::clasificar('Revisión de 10.000'))->toBe('revision')
        ->and(MantenimientoEstimador::clasificar('Cambio de plumillas'))->toBe('plumillas');
});
