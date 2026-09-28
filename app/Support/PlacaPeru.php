<?php

namespace App\Support;

/**
 * Placas peruanas.
 *
 * Auto (4 ruedas), formato actual: 123-SD4.
 * Moto, formato actual: 34-AW12.
 * También se aceptan los formatos que siguen circulando: ABC-123 y AB-1234.
 */
class PlacaPeru
{
    public const AUTO = '/^\d{3}-[A-Z]{2}\d$/';

    public const MOTO = '/^\d{2}-[A-Z]{2}\d{2}$/';

    public const AUTO_CLASICO = '/^[A-Z]{3}-\d{3}$/';

    public const MOTO_CLASICO = '/^[A-Z]{2}-\d{4}$/';

    public static function grupo(string $tipo): string
    {
        return match ($tipo) {
            'moto' => 'moto',
            'mototaxi', 'otro' => 'cualquiera',
            default => 'auto',
        };
    }

    public static function passes(string $placa, string $grupo = 'auto'): bool
    {
        $placa = mb_strtoupper(trim($placa));
        $patterns = match ($grupo) {
            'moto' => [self::MOTO, self::MOTO_CLASICO],
            'cualquiera' => [self::AUTO, self::AUTO_CLASICO, self::MOTO, self::MOTO_CLASICO],
            default => [self::AUTO, self::AUTO_CLASICO],
        };

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $placa) === 1) {
                return true;
            }
        }

        return false;
    }

    public static function message(string $grupo = 'auto'): string
    {
        return match ($grupo) {
            'moto' => 'La placa de una moto es 34-AW12 (o el formato anterior AB-1234).',
            'cualquiera' => 'La placa debe ser 123-SD4, ABC-123, 34-AW12 o AB-1234.',
            default => 'La placa de un auto es 123-SD4 (o el formato anterior ABC-123).',
        };
    }
}
