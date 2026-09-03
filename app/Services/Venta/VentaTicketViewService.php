<?php

declare(strict_types=1);

namespace App\Services\Venta;

use App\Models\TallerSetting;
use App\Models\Venta;
use App\Support\Caja\TicketAnchoMm;

final class VentaTicketViewService
{
    private const METODO_LABELS = [
        'efectivo' => 'Efectivo',
        'yape' => 'Yape',
        'plin' => 'Plin',
        'tarjeta' => 'Tarjeta',
        'transferencia' => 'Transferencia',
        'mixto' => 'Mixto',
    ];

    /**
     * @return array<string, mixed>
     */
    public function viewData(Venta $venta, TallerSetting $cfg, ?string $anchoMm = null, bool $autoPrint = false): array
    {
        $venta->loadMissing([
            'lineas' => fn ($q) => $q->orderBy('orden'),
            'pagos',
            'cliente:id,nombres,apellidos,tipo_documento,numero_documento',
            'vehiculo:id,placa',
            'ordenTrabajo:id,numero',
            'sede:id,nombre',
            'creadoPor:id,name',
            'felDocument:id,numero_completo',
        ]);

        $ancho = TicketAnchoMm::normalize($anchoMm, (string) $cfg->ticketAnchoMm());

        $cliente = $venta->cliente;
        $clienteNombre = $cliente?->nombreCompleto() ?: '—';
        $clienteDoc = null;
        if ($cliente && filled($cliente->numero_documento)) {
            $tipo = strtoupper((string) ($cliente->tipo_documento ?: 'DOC'));
            $clienteDoc = trim($tipo.' '.$cliente->numero_documento);
        }

        $pagosTicket = $venta->pagos->map(static function ($pago): array {
            return [
                'metodo_label' => self::METODO_LABELS[$pago->metodo] ?? (string) $pago->metodo,
                'monto' => number_format((float) $pago->monto, 2, '.', ''),
                'monto_recibido' => $pago->monto_recibido !== null
                    ? number_format((float) $pago->monto_recibido, 2, '.', '')
                    : null,
                'vuelto' => $pago->vuelto !== null
                    ? number_format((float) $pago->vuelto, 2, '.', '')
                    : null,
                'es_efectivo' => $pago->metodo === 'efectivo',
            ];
        })->values()->all();

        $lineas = $venta->lineas->map(static fn ($ln): array => [
            'descripcion' => (string) $ln->descripcion,
            'cantidad' => number_format((float) $ln->cantidad, 3, '.', ''),
            'subtotal' => number_format((float) $ln->subtotal, 2, '.', ''),
        ])->values()->all();

        $trim = static function (?string $v): ?string {
            if ($v === null) {
                return null;
            }
            $t = trim($v);

            return $t === '' ? null : $t;
        };

        $fechaCobro = ($venta->fecha_pago ?? $venta->created_at)
            ?->timezone(config('app.timezone'))
            ->format('d/m/Y H:i') ?? '—';

        $estadoLabel = match ($venta->estado) {
            Venta::ESTADO_PAGADO => 'PAGADO',
            Venta::ESTADO_ANULADO => 'ANULADO',
            Venta::ESTADO_PARCIAL => 'PARCIAL',
            default => 'PENDIENTE',
        };

        return [
            'ancho_mm' => $ancho,
            'clinic_logo_url' => $cfg->logo_url,
            'clinic_nombre' => $cfg->nombre_comercial ?: $cfg->razon_social ?: config('app.name'),
            'clinic_ruc' => $trim($cfg->ruc),
            'clinic_direccion' => $trim($cfg->direccion_fiscal),
            'clinic_telefono' => $trim($cfg->telefono_principal),
            'moneda' => $venta->moneda === 'USD' ? 'USD' : 'PEN',
            'igv_porcentaje' => number_format($cfg->igvPorcentajeEfectivo(), 2, '.', ''),
            'venta' => $venta,
            'estado_label' => $estadoLabel,
            'lineas' => $lineas,
            'fecha_cobro' => $fechaCobro,
            'sede_nombre' => $venta->sede?->nombre,
            'cliente_nombre' => $clienteNombre,
            'cliente_doc' => $clienteDoc,
            'vehiculo_placa' => $venta->vehiculo?->placa,
            'orden_numero' => $venta->ordenTrabajo?->numero,
            'cajero_nombre' => $venta->creadoPor?->name,
            'metodo_pago_label' => self::METODO_LABELS[$venta->metodo_pago] ?? $venta->metodo_pago,
            'pagos' => $pagosTicket,
            'cpe_numero' => $venta->felDocument?->numero_completo,
            'auto_print' => $autoPrint,
        ];
    }
}
