<?php

namespace App\Services\Ai;

use Carbon\CarbonInterface;

/**
 * Estima el próximo aceite, revisión o plumillas con el historial de ese auto.
 * Si hay varias visitas, usa el ritmo real. Si solo hay una, usa un plazo de taller.
 */
final class MantenimientoEstimador
{
    /** @var array<string, array{km: ?int, dias: int, etiqueta: string}> */
    public const TIPOS = [
        'aceite' => ['km' => 5000, 'dias' => 180, 'etiqueta' => 'cambio de aceite'],
        'revision' => ['km' => 10000, 'dias' => 365, 'etiqueta' => 'revisión'],
        'plumillas' => ['km' => null, 'dias' => 365, 'etiqueta' => 'cambio de plumillas'],
    ];

    public static function clasificar(string $descripcion): ?string
    {
        $text = mb_strtolower($descripcion);

        if (self::contiene($text, ['plumilla', 'escobilla', 'wiper', 'limpiaparabrisas'])) {
            return 'plumillas';
        }

        if (self::contiene($text, ['aceite', 'lubric', '5w30', '5w-30', '10w40', '10w-40', '15w40'])) {
            return 'aceite';
        }

        if (self::contiene($text, ['revisi', 'mantenimiento', 'afinamiento'])) {
            return 'revision';
        }

        return null;
    }

    /**
     * @param  list<array{at: CarbonInterface, km: ?int}>  $eventos
     * @return array{tipo: string, etiqueta: string, ultimo_at: string, ultimo_km: ?int, km_actual: ?int, dias_restantes: int, km_restantes: ?int, atrasado: bool, detalle: string}|null
     */
    public function evaluar(string $tipo, array $eventos, ?int $kmActual, CarbonInterface $hoy): ?array
    {
        $def = self::TIPOS[$tipo] ?? null;
        if ($def === null || $eventos === []) {
            return null;
        }

        usort($eventos, fn (array $a, array $b): int => $a['at'] <=> $b['at']);
        $ultimo = $eventos[array_key_last($eventos)];
        $intervalo = $this->intervalo($tipo, $eventos, $def);
        $daysSince = (int) round(abs($hoy->diffInDays($ultimo['at'])));
        $diasRestantes = $intervalo['dias'] - $daysSince;

        $kmRestantes = null;
        $kmSince = null;
        if ($intervalo['km'] !== null && $kmActual !== null && $ultimo['km'] !== null && $kmActual >= $ultimo['km']) {
            $kmSince = $kmActual - $ultimo['km'];
            $kmRestantes = $intervalo['km'] - $kmSince;
        }

        $porKm = $kmRestantes !== null && $kmRestantes <= 800;
        $porDias = $diasRestantes <= 21;
        if (! $porKm && ! $porDias) {
            return null;
        }

        $atrasado = $diasRestantes < 0 || ($kmRestantes !== null && $kmRestantes < 0);
        $detalle = $this->detalle($ultimo, $kmActual, $kmSince, $diasRestantes, $kmRestantes, $intervalo);

        return [
            'tipo' => $tipo,
            'etiqueta' => $def['etiqueta'],
            'ultimo_at' => $ultimo['at']->toDateString(),
            'ultimo_km' => $ultimo['km'],
            'km_actual' => $kmActual,
            'dias_restantes' => $diasRestantes,
            'km_restantes' => $kmRestantes,
            'atrasado' => $atrasado,
            'detalle' => $detalle,
        ];
    }

    /**
     * @param  list<array{at: CarbonInterface, km: ?int}>  $eventos
     * @param  array{km: ?int, dias: int, etiqueta: string}  $def
     * @return array{km: ?int, dias: int}
     */
    private function intervalo(string $tipo, array $eventos, array $def): array
    {
        $dias = [];
        $kms = [];

        for ($i = 1, $n = count($eventos); $i < $n; $i++) {
            $prev = $eventos[$i - 1];
            $next = $eventos[$i];
            $gap = (int) round(abs($next['at']->diffInDays($prev['at'])));
            if ($gap >= 20) {
                $dias[] = $gap;
            }
            if ($def['km'] !== null && $prev['km'] !== null && $next['km'] !== null && $next['km'] > $prev['km']) {
                $kms[] = $next['km'] - $prev['km'];
            }
        }

        return [
            'km' => $tipo === 'plumillas' ? null : ($kms === [] ? $def['km'] : $this->mediana($kms)),
            'dias' => $dias === [] ? $def['dias'] : $this->mediana($dias),
        ];
    }

    /**
     * @param  array{at: CarbonInterface, km: ?int}  $ultimo
     * @param  array{km: ?int, dias: int}  $intervalo
     */
    private function detalle(array $ultimo, ?int $kmActual, ?int $kmSince, int $diasRestantes, ?int $kmRestantes, array $intervalo): string
    {
        $fecha = $ultimo['at']->locale('es')->isoFormat('D MMM YYYY');
        $partes = ["La última vez fue el {$fecha}"];
        if ($ultimo['km'] !== null) {
            $partes[] = 'a los '.number_format($ultimo['km'], 0, '.', ',').' km';
        }
        if ($kmActual !== null) {
            $partes[] = 'y ahora va por '.number_format($kmActual, 0, '.', ',').' km';
        }
        if ($kmRestantes !== null) {
            $partes[] = $kmRestantes < 0
                ? 'ya pasó unos '.number_format(abs($kmRestantes), 0, '.', ',').' km del plazo de '.number_format((int) $intervalo['km'], 0, '.', ',')
                : 'le quedan unos '.number_format($kmRestantes, 0, '.', ',').' km';
        } elseif ($diasRestantes < 0) {
            $partes[] = 'ya pasaron '.abs($diasRestantes).' días del plazo';
        } else {
            $partes[] = "le quedan unos {$diasRestantes} días";
        }

        return implode(', ', $partes).'.';
    }

    /**
     * @param  list<int>  $nums
     */
    private function mediana(array $nums): int
    {
        sort($nums);
        $count = count($nums);
        $mid = intdiv($count, 2);

        if ($count % 2 === 1) {
            return $nums[$mid];
        }

        return (int) round(($nums[$mid - 1] + $nums[$mid]) / 2);
    }

    /**
     * @param  list<string>  $needles
     */
    private static function contiene(string $text, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (str_contains($text, $needle)) {
                return true;
            }
        }

        return false;
    }
}
