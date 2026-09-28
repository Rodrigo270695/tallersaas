<?php

namespace App\Services\Taller;

/**
 * Reparte el monto de un siniestro entre la aseguradora y el cliente.
 */
class SiniestroMontos
{
    /**
     * @return array{monto_reclamado: string, monto_seguro: string, monto_cliente: string, cobertura_pct: ?string}
     */
    public static function split(
        float|string $reclamado,
        float|string|null $coberturaPct,
        float|string|null $montoSeguro,
        float|string|null $montoCliente,
    ): array {
        $reclamado = self::money(max(0, (float) $reclamado));

        if ($coberturaPct !== null && $coberturaPct !== '') {
            $pct = max(0, min(100, (float) $coberturaPct));
            $seguro = self::money($reclamado * $pct / 100);
            $cliente = self::money($reclamado - $seguro);

            return [
                'monto_reclamado' => self::format($reclamado),
                'monto_seguro' => self::format($seguro),
                'monto_cliente' => self::format($cliente),
                'cobertura_pct' => self::format($pct),
            ];
        }

        $seguro = self::money(max(0, (float) ($montoSeguro ?? 0)));
        if ($seguro > $reclamado) {
            $seguro = $reclamado;
        }

        if ($montoCliente === null || $montoCliente === '') {
            $cliente = self::money($reclamado - $seguro);
        } else {
            $cliente = self::money(max(0, (float) $montoCliente));
        }

        return [
            'monto_reclamado' => self::format($reclamado),
            'monto_seguro' => self::format($seguro),
            'monto_cliente' => self::format($cliente),
            'cobertura_pct' => null,
        ];
    }

    private static function money(float $value): float
    {
        return round($value, 2);
    }

    private static function format(float $value): string
    {
        return number_format($value, 2, '.', '');
    }
}
