<?php

declare(strict_types=1);

namespace App\Services\Caja;

use App\Models\CajaSesion;
use App\Models\Venta;
use App\Models\VentaPago;

final class CajaSesionArqueoService
{
    /**
     * @return array<string, mixed>
     */
    public function build(CajaSesion $sesion, ?string $contadoEfectivo): array
    {
        $ventasPagadas = $sesion->ventas()
            ->whereIn('estado', [Venta::ESTADO_PAGADO, Venta::ESTADO_PARCIAL]);

        $totalVentas = round((float) (clone $ventasPagadas)->sum('total'), 2);

        $pagos = VentaPago::query()
            ->whereIn('venta_id', (clone $ventasPagadas)->select('id'));

        $efectivo = round((float) (clone $pagos)->where('metodo', 'efectivo')->sum('monto'), 2);
        $otros = round((float) (clone $pagos)->where('metodo', '!=', 'efectivo')->sum('monto'), 2);
        $egresos = round((float) $sesion->egresos()->sum('monto'), 2);

        $esperado = round((float) $sesion->saldo_apertura + $efectivo - $egresos, 2);
        $contado = $contadoEfectivo !== null ? round((float) $contadoEfectivo, 2) : null;
        $diferencia = $contado !== null ? round($contado - $esperado, 2) : null;

        return [
            'saldo_apertura' => number_format((float) $sesion->saldo_apertura, 2, '.', ''),
            'ventas_total' => number_format($totalVentas, 2, '.', ''),
            'ventas_efectivo' => number_format($efectivo, 2, '.', ''),
            'ventas_otros' => number_format($otros, 2, '.', ''),
            'egresos' => number_format($egresos, 2, '.', ''),
            'efectivo_esperado' => number_format($esperado, 2, '.', ''),
            'efectivo_contado' => $contado !== null ? number_format($contado, 2, '.', '') : null,
            'diferencia' => $diferencia !== null ? number_format($diferencia, 2, '.', '') : null,
        ];
    }
}
