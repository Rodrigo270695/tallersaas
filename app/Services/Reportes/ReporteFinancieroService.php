<?php

declare(strict_types=1);

namespace App\Services\Reportes;

use App\Models\Sede;
use App\Models\TallerSetting;
use App\Models\Venta;
use App\Support\Reportes\ReportePeriodo;
use Carbon\CarbonInterface;

final class ReporteFinancieroService
{
    /**
     * @return array<string, mixed>
     */
    public function build(string $periodo, ?string $sedeId = null, ?CarbonInterface $now = null): array
    {
        $periodo = ReportePeriodo::parse($periodo);
        [$desde, $hasta] = ReportePeriodo::rango($periodo, $now);
        $moneda = (string) (TallerSetting::current()->moneda ?: 'PEN');

        $base = Venta::query()
            ->whereIn('estado', [Venta::ESTADO_PAGADO, Venta::ESTADO_PARCIAL])
            ->whereBetween('fecha_pago', [$desde, $hasta]);

        if (is_string($sedeId) && $sedeId !== '') {
            $base->where('sede_id', $sedeId);
        }

        $ventasCount = (clone $base)->count();
        $ventasTotal = (float) (clone $base)->sum('total');
        $igvTotal = (float) (clone $base)->sum('igv_monto');
        $ticketPromedio = $ventasCount > 0 ? round($ventasTotal / $ventasCount, 2) : 0.0;

        $porMetodo = (clone $base)
            ->selectRaw('metodo_pago, count(*) as ventas, coalesce(sum(total), 0) as total')
            ->groupBy('metodo_pago')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row): array => [
                'metodo' => (string) $row->metodo_pago,
                'label' => $this->labelMetodo((string) $row->metodo_pago),
                'ventas' => (int) $row->ventas,
                'total' => number_format((float) $row->total, 2, '.', ''),
            ])
            ->all();

        $sedeRows = (clone $base)
            ->selectRaw('sede_id, count(*) as ventas, coalesce(sum(total), 0) as total')
            ->groupBy('sede_id')
            ->orderByDesc('total')
            ->get();

        $sedeNombres = Sede::query()
            ->whereIn('id', $sedeRows->pluck('sede_id')->filter()->all())
            ->pluck('nombre', 'id');

        $porSede = $sedeRows->map(fn ($row): array => [
            'sede_id' => (string) $row->sede_id,
            'sede_nombre' => (string) ($sedeNombres[$row->sede_id] ?? 'Sede'),
            'ventas' => (int) $row->ventas,
            'total' => number_format((float) $row->total, 2, '.', ''),
        ])->all();

        $felCounts = (clone $base)
            ->selectRaw("coalesce(fel_estado, 'sin_cpe') as fel, count(*) as total")
            ->groupBy('fel')
            ->pluck('total', 'fel');

        return [
            'moneda' => $moneda,
            'periodo' => $periodo,
            'periodo_label' => ReportePeriodo::etiqueta($periodo),
            'desde' => $desde->toIso8601String(),
            'hasta' => $hasta->toIso8601String(),
            'sede_id' => $sedeId,
            'kpis' => [
                'ventas_count' => $ventasCount,
                'ventas_total' => number_format($ventasTotal, 2, '.', ''),
                'ticket_promedio' => number_format($ticketPromedio, 2, '.', ''),
                'igv_total' => number_format($igvTotal, 2, '.', ''),
            ],
            'por_metodo' => $porMetodo,
            'por_sede' => $porSede,
            'fel' => [
                'emitidos' => (int) ($felCounts[Venta::FEL_EMITIDO] ?? 0),
                'pendientes' => (int) ($felCounts[Venta::FEL_PENDIENTE] ?? 0),
                'rechazados' => (int) ($felCounts[Venta::FEL_RECHAZADO] ?? 0),
                'sin_cpe' => (int) ($felCounts['sin_cpe'] ?? 0),
            ],
        ];
    }

    private function labelMetodo(string $metodo): string
    {
        return match ($metodo) {
            'efectivo' => 'Efectivo',
            'yape' => 'Yape',
            'plin' => 'Plin',
            'tarjeta' => 'Tarjeta',
            'transferencia' => 'Transferencia',
            'mixto' => 'Mixto',
            default => $metodo,
        };
    }
}
