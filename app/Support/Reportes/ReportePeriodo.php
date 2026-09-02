<?php

declare(strict_types=1);

namespace App\Support\Reportes;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

final class ReportePeriodo
{
    public const HOY = 'hoy';

    public const SEMANA = 'semana';

    public const MES = 'mes';

    public const MES_PASADO = 'mes_pasado';

    /**
     * @return list<string>
     */
    public static function valores(): array
    {
        return [self::HOY, self::SEMANA, self::MES, self::MES_PASADO];
    }

    public static function parse(?string $periodo): string
    {
        $periodo = (string) $periodo;

        return in_array($periodo, self::valores(), true) ? $periodo : self::MES;
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    public static function rango(string $periodo, ?CarbonInterface $now = null): array
    {
        $tz = (string) config('app.timezone', 'America/Lima');
        $now = CarbonImmutable::parse(($now ?? now($tz))->toIso8601String())->timezone($tz);
        $periodo = self::parse($periodo);

        return match ($periodo) {
            self::HOY => [$now->startOfDay(), $now->endOfDay()],
            self::SEMANA => [
                $now->startOfWeek(CarbonInterface::MONDAY),
                $now->endOfWeek(CarbonInterface::SUNDAY),
            ],
            self::MES_PASADO => [
                $now->subMonthNoOverflow()->startOfMonth(),
                $now->subMonthNoOverflow()->endOfMonth(),
            ],
            default => [$now->startOfMonth(), $now->endOfMonth()],
        };
    }

    public static function etiqueta(string $periodo): string
    {
        return match (self::parse($periodo)) {
            self::HOY => 'Hoy',
            self::SEMANA => 'Esta semana',
            self::MES_PASADO => 'Mes pasado',
            default => 'Este mes',
        };
    }
}
