<?php

namespace App\Support\Fel;

use App\Models\FelSerie;
use App\Models\Venta;
use RuntimeException;

final class FelSerieResolver
{
    public function codigoSerieParaVenta(Venta $venta, int $tipoComprobante): ?string
    {
        return $this->queryParaVenta($venta, $tipoComprobante, false)->value('serie');
    }

    public function resolverParaVenta(Venta $venta, int $tipoComprobante, bool $forUpdate = false): FelSerie
    {
        $serie = $this->queryParaVenta($venta, $tipoComprobante, $forUpdate)->first();

        if ($serie === null) {
            $serie = $this->asegurarSerie((string) $venta->sede_id, $tipoComprobante);
            if ($forUpdate) {
                $serie = FelSerie::query()->whereKey($serie->id)->lockForUpdate()->firstOrFail();
            }
        }

        return $serie;
    }

    public function asegurarSerie(string $sedeId, int $tipoComprobante): FelSerie
    {
        $codigo = FelSerie::serieSugerida($tipoComprobante);

        return FelSerie::query()->firstOrCreate(
            [
                'sede_id' => $sedeId,
                'tipo_comprobante' => $tipoComprobante,
                'serie' => $codigo,
            ],
            [
                'ultimo_correlativo' => 0,
                'activo' => true,
            ],
        );
    }

    public function asegurarSeriesDeSede(string $sedeId): void
    {
        $this->asegurarSerie($sedeId, FelSerie::TIPO_BOLETA);
        $this->asegurarSerie($sedeId, FelSerie::TIPO_FACTURA);
    }

    private function queryParaVenta(Venta $venta, int $tipoComprobante, bool $forUpdate)
    {
        $query = FelSerie::query()
            ->where('tipo_comprobante', $tipoComprobante)
            ->where('activo', true)
            ->where('sede_id', $venta->sede_id)
            ->orderBy('serie');

        if ($forUpdate) {
            $query->lockForUpdate();
        }

        return $query;
    }
}
