<?php

declare(strict_types=1);

namespace App\Services\Inventario;

use App\Models\ExistenciaSede;
use App\Models\MovimientoInventario;

final class InventarioStockService
{
    public function registrarEntrada(
        string $productoId,
        string $sedeId,
        string $cantidad,
        ?string $notas,
        ?string $userId,
    ): MovimientoInventario {
        $qty = abs(round((float) $cantidad, 3));

        return MovimientoInventario::aplicar(
            $productoId,
            $sedeId,
            MovimientoInventario::TIPO_ENTRADA,
            (string) $qty,
            $notas,
            $userId,
        );
    }

    public function registrarSalida(
        string $productoId,
        string $sedeId,
        string $cantidad,
        ?string $notas,
        ?string $userId,
        ?string $ventaId = null,
        string $tipo = MovimientoInventario::TIPO_SALIDA,
    ): MovimientoInventario {
        $qty = abs(round((float) $cantidad, 3));
        $tipoKardex = in_array($tipo, [MovimientoInventario::TIPO_SALIDA, MovimientoInventario::TIPO_MERMA], true)
            ? $tipo
            : MovimientoInventario::TIPO_SALIDA;

        return MovimientoInventario::aplicar(
            $productoId,
            $sedeId,
            $tipoKardex,
            (string) (-1 * $qty),
            $notas,
            $userId,
            $ventaId,
        );
    }

    public function ajustarACantidad(
        string $productoId,
        string $sedeId,
        string $cantidadObjetivo,
        ?string $notas,
        ?string $userId,
    ): ?MovimientoInventario {
        $objetivo = round((float) $cantidadObjetivo, 3);
        $actual = round((float) (string) (
            ExistenciaSede::query()
                ->where('producto_id', $productoId)
                ->where('sede_id', $sedeId)
                ->value('cantidad') ?? 0
        ), 3);

        $delta = round($objetivo - $actual, 3);
        if (abs($delta) < 0.0005) {
            return null;
        }

        return MovimientoInventario::aplicar(
            $productoId,
            $sedeId,
            MovimientoInventario::TIPO_AJUSTE,
            (string) $delta,
            $notas,
            $userId,
        );
    }
}
