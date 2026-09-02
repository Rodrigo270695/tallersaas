<?php

declare(strict_types=1);

namespace App\Services\Reportes;

use App\Models\OrdenTrabajo;
use App\Models\Sede;
use App\Models\User;
use App\Support\Reportes\ReportePeriodo;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;

final class ReporteOrdenesService
{
    /**
     * @return array<string, mixed>
     */
    public function build(string $periodo, ?string $sedeId = null, ?CarbonInterface $now = null): array
    {
        $periodo = ReportePeriodo::parse($periodo);
        [$desde, $hasta] = ReportePeriodo::rango($periodo, $now);

        $snapshotQuery = OrdenTrabajo::query();
        $periodoQuery = OrdenTrabajo::query()->whereBetween('ingreso_at', [$desde, $hasta]);

        if (is_string($sedeId) && $sedeId !== '') {
            $snapshotQuery->where('sede_id', $sedeId);
            $periodoQuery->where('sede_id', $sedeId);
        }

        $snapshot = $this->contarEstados($snapshotQuery);
        $enPeriodo = $this->contarEstados($periodoQuery);

        $sedeRows = (clone $periodoQuery)
            ->selectRaw('sede_id, count(*) as total')
            ->groupBy('sede_id')
            ->orderByDesc('total')
            ->get();

        $sedeNombres = Sede::query()
            ->whereIn('id', $sedeRows->pluck('sede_id')->filter()->all())
            ->pluck('nombre', 'id');

        $porSede = $sedeRows->map(fn ($row): array => [
            'sede_id' => (string) $row->sede_id,
            'sede_nombre' => (string) ($sedeNombres[$row->sede_id] ?? 'Sede'),
            'total' => (int) $row->total,
        ])->all();

        $userRows = (clone $periodoQuery)
            ->whereNotNull('created_by_id')
            ->selectRaw('created_by_id, count(*) as total')
            ->groupBy('created_by_id')
            ->orderByDesc('total')
            ->limit(8)
            ->get();

        $nombres = User::query()
            ->whereIn('id', $userRows->pluck('created_by_id')->all())
            ->pluck('name', 'id');

        $porUsuario = $userRows->map(fn ($row): array => [
            'user_id' => (string) $row->created_by_id,
            'nombre' => (string) ($nombres[$row->created_by_id] ?? 'Usuario'),
            'total' => (int) $row->total,
        ])->all();

        return [
            'periodo' => $periodo,
            'periodo_label' => ReportePeriodo::etiqueta($periodo),
            'desde' => $desde->toIso8601String(),
            'hasta' => $hasta->toIso8601String(),
            'sede_id' => $sedeId,
            'snapshot' => $snapshot,
            'en_periodo' => $enPeriodo,
            'ingresadas' => array_sum($enPeriodo),
            'por_sede' => $porSede,
            'por_usuario' => $porUsuario,
        ];
    }

    /**
     * @param  Builder<OrdenTrabajo>  $query
     * @return array<string, int>
     */
    private function contarEstados($query): array
    {
        $counts = (clone $query)
            ->selectRaw('estado, count(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado');

        $out = [];
        foreach (OrdenTrabajo::ESTADOS as $estado) {
            $out[$estado] = (int) ($counts[$estado] ?? 0);
        }

        return $out;
    }
}
