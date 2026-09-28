<?php

declare(strict_types=1);

use App\Support\PlacaPeru;

it('acepta la placa actual de un auto', function (): void {
    expect(PlacaPeru::passes('123-SD4', 'auto'))->toBeTrue()
        ->and(PlacaPeru::passes('123-sd4', 'auto'))->toBeTrue();
});

it('acepta la placa actual de una moto', function (): void {
    expect(PlacaPeru::passes('34-AW12', 'moto'))->toBeTrue()
        ->and(PlacaPeru::passes('123-SD4', 'moto'))->toBeFalse();
});

it('sigue aceptando las placas que ya circulan', function (): void {
    expect(PlacaPeru::passes('ABC-123', 'auto'))->toBeTrue()
        ->and(PlacaPeru::passes('AB-1234', 'moto'))->toBeTrue()
        ->and(PlacaPeru::passes('ABC-123', 'cualquiera'))->toBeTrue();
});

it('rechaza una placa a medias o con símbolos', function (): void {
    expect(PlacaPeru::passes('123-SD', 'auto'))->toBeFalse()
        ->and(PlacaPeru::passes('ABC 123', 'auto'))->toBeFalse()
        ->and(PlacaPeru::passes('12-AW12', 'auto'))->toBeFalse();
});
