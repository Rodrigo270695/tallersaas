<?php

declare(strict_types=1);

namespace App\Services\Dashboard;

use App\Models\CajaSesion;
use App\Models\Cita;
use App\Models\Cliente;
use App\Models\OrdenTrabajo;
use App\Models\TallerSetting;
use App\Models\User;
use App\Models\Venta;
use App\Tenancy\TenantManager;
use Carbon\CarbonInterface;
use Throwable;

/**
 * Métricas del panel del taller (solo con tenant resuelto).
 */
final class DashboardStatsService
{
    public function __construct(
        private readonly TenantManager $tenants,
    ) {}

    /**
     * @param  array<string, bool>  $capabilities
     * @return array<string, mixed>
     */
    public function build(User $user, array $capabilities): array
    {
        abort_unless($this->tenants->check(), 403);

        try {
            return $this->payload($user, $capabilities);
        } catch (Throwable $e) {
            if (app()->runningUnitTests()) {
                throw $e;
            }

            report($e);

            return $this->emptyPayload();
        }
    }

    /**
     * @param  array<string, bool>  $capabilities
     * @return array<string, mixed>
     */
    private function payload(User $user, array $capabilities): array
    {
        $tz = (string) config('app.timezone', 'America/Lima');
        $now = now($tz);
        $hoyInicio = $now->copy()->startOfDay();
        $hoyFin = $now->copy()->endOfDay();

        $settings = TallerSetting::current();
        $moneda = (string) ($settings->moneda ?: 'PEN');

        $kpis = [
            'citas_hoy' => 0,
            'citas_pendientes_hoy' => 0,
            'ot_abiertas' => 0,
            'ot_listas' => 0,
            'ventas_hoy_count' => 0,
            'ventas_hoy_total' => '0.00',
        ];

        $citasHoy = [];
        $ordenesActivas = [];
        $miSesion = null;

        if ($capabilities['citas'] ?? false) {
            $citasQuery = Cita::query()->whereBetween('inicia_at', [$hoyInicio, $hoyFin]);

            $kpis['citas_hoy'] = (clone $citasQuery)
                ->whereNotIn('estado', [Cita::ESTADO_CANCELADA, Cita::ESTADO_NO_ASISTIO])
                ->count();
            $kpis['citas_pendientes_hoy'] = (clone $citasQuery)
                ->whereIn('estado', Cita::ESTADOS_ACTIVAS)
                ->count();

            $citasHoy = Cita::query()
                ->with([
                    'cliente:id,nombres,apellidos',
                    'vehiculo:id,placa',
                    'sede:id,nombre',
                ])
                ->whereBetween('inicia_at', [$hoyInicio, $hoyFin])
                ->whereIn('estado', Cita::ESTADOS_ACTIVAS)
                ->orderBy('inicia_at')
                ->limit(8)
                ->get()
                ->map(fn (Cita $cita) => $this->mapCita($cita))
                ->all();
        }

        if ($capabilities['ordenes'] ?? false) {
            $kpis['ot_abiertas'] = OrdenTrabajo::query()
                ->whereIn('estado', [OrdenTrabajo::ESTADO_ABIERTA, OrdenTrabajo::ESTADO_EN_PROCESO])
                ->count();
            $kpis['ot_listas'] = OrdenTrabajo::query()
                ->where('estado', OrdenTrabajo::ESTADO_LISTA)
                ->count();

            $ordenesActivas = OrdenTrabajo::query()
                ->with([
                    'cliente:id,nombres,apellidos',
                    'vehiculo:id,placa',
                ])
                ->whereIn('estado', [
                    OrdenTrabajo::ESTADO_ABIERTA,
                    OrdenTrabajo::ESTADO_EN_PROCESO,
                    OrdenTrabajo::ESTADO_LISTA,
                ])
                ->orderByRaw("case estado when 'lista' then 0 when 'en_proceso' then 1 else 2 end")
                ->orderByDesc('ingreso_at')
                ->limit(8)
                ->get()
                ->map(fn (OrdenTrabajo $orden) => $this->mapOrden($orden))
                ->all();
        }

        if ($capabilities['ventas'] ?? false) {
            $ventasHoy = Venta::query()
                ->whereIn('estado', [Venta::ESTADO_PAGADO, Venta::ESTADO_PARCIAL])
                ->whereBetween('fecha_pago', [$hoyInicio, $hoyFin]);

            $kpis['ventas_hoy_count'] = (clone $ventasHoy)->count();
            $kpis['ventas_hoy_total'] = number_format((float) (clone $ventasHoy)->sum('total'), 2, '.', '');
        }

        if ($capabilities['caja'] ?? false) {
            $sesion = CajaSesion::query()
                ->with('sede:id,nombre')
                ->where('estado', CajaSesion::ESTADO_ABIERTA)
                ->where('opened_by_id', $user->getAuthIdentifier())
                ->first();

            if ($sesion !== null) {
                $miSesion = [
                    'id' => $sesion->id,
                    'sede_id' => $sesion->sede_id,
                    'sede_nombre' => $sesion->sede?->nombre,
                    'opened_at' => $sesion->opened_at?->toIso8601String(),
                    'saldo_apertura' => $sesion->saldo_apertura,
                ];
            }
        }

        return [
            'moneda' => $moneda,
            'hoy_label' => $this->formatHoy($now),
            'greeting' => $this->greeting($now),
            'kpis' => $kpis,
            'citas_hoy' => $citasHoy,
            'ordenes_activas' => $ordenesActivas,
            'mi_sesion' => $miSesion,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function emptyPayload(): array
    {
        return [
            'moneda' => 'PEN',
            'hoy_label' => '',
            'greeting' => 'Hola',
            'kpis' => [
                'citas_hoy' => 0,
                'citas_pendientes_hoy' => 0,
                'ot_abiertas' => 0,
                'ot_listas' => 0,
                'ventas_hoy_count' => 0,
                'ventas_hoy_total' => '0.00',
            ],
            'citas_hoy' => [],
            'ordenes_activas' => [],
            'mi_sesion' => null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function mapCita(Cita $cita): array
    {
        return [
            'id' => $cita->id,
            'inicia_at' => $cita->inicia_at?->toIso8601String(),
            'duracion_minutos' => $cita->duracion_minutos,
            'estado' => $cita->estado,
            'motivo' => $cita->motivo,
            'cliente_nombre' => $cita->cliente instanceof Cliente
                ? $cita->cliente->nombreCompleto()
                : null,
            'vehiculo_placa' => $cita->vehiculo?->placa,
            'sede_nombre' => $cita->sede?->nombre,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function mapOrden(OrdenTrabajo $orden): array
    {
        return [
            'id' => $orden->id,
            'numero' => $orden->numero,
            'estado' => $orden->estado,
            'saldo' => $orden->saldo,
            'cliente_nombre' => $orden->cliente instanceof Cliente
                ? $orden->cliente->nombreCompleto()
                : null,
            'vehiculo_placa' => $orden->vehiculo?->placa,
        ];
    }

    private function greeting(CarbonInterface $now): string
    {
        $hour = (int) $now->format('G');

        if ($hour < 12) {
            return 'Buenos días';
        }

        if ($hour < 19) {
            return 'Buenas tardes';
        }

        return 'Buenas noches';
    }

    private function formatHoy(CarbonInterface $now): string
    {
        return $now->locale('es')->isoFormat('dddd D [de] MMMM, YYYY');
    }
}
