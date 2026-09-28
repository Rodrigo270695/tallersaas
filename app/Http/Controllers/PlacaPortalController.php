<?php

namespace App\Http\Controllers;

use App\Models\OrdenTrabajo;
use App\Models\Presupuesto;
use App\Models\TallerSetting;
use App\Models\Vehiculo;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlacaPortalController extends Controller
{
    public function show(Request $request, ?string $placa = null): Response
    {
        abort_if(tenant_id() === null || tenant_id() === '', 404);

        $raw = $placa ?? (string) $request->string('placa', '');
        $normalized = self::normalize($raw);
        $settings = TallerSetting::current();

        $vehiculos = $normalized === ''
            ? collect()
            : Vehiculo::query()
                ->with([
                    'cliente:id,nombres,apellidos',
                    'marca:id,nombre',
                    'modelo:id,nombre',
                    'aseguradora:id,nombre',
                ])
                ->whereRaw(
                    "upper(regexp_replace(placa, '[^A-Za-z0-9]', '', 'g')) = ?",
                    [$normalized],
                )
                ->orderBy('placa')
                ->get();

        $vehiculoIds = $vehiculos->pluck('id');

        $ordenes = $vehiculoIds->isEmpty()
            ? collect()
            : OrdenTrabajo::query()
                ->whereIn('vehiculo_id', $vehiculoIds)
                ->where('estado', '!=', OrdenTrabajo::ESTADO_ANULADA)
                ->with(['siniestro.aseguradora:id,nombre'])
                ->orderByDesc('ingreso_at')
                ->get();

        $presupuestos = $vehiculoIds->isEmpty()
            ? collect()
            : Presupuesto::query()
                ->whereIn('vehiculo_id', $vehiculoIds)
                ->orderByDesc('created_at')
                ->get(['id', 'vehiculo_id', 'numero', 'estado', 'total', 'public_token', 'created_at']);

        return Inertia::render('public/placa', [
            'placa' => $normalized,
            'taller' => [
                'nombre' => trim((string) ($settings->nombre_comercial ?: $settings->razon_social ?: 'Taller')),
                'telefono' => $settings->telefono_principal,
                'logo_url' => $settings->logo_url ?? null,
            ],
            'vehiculos' => $vehiculos->map(function (Vehiculo $vehiculo) use ($ordenes, $presupuestos): array {
                $label = trim(implode(' ', array_filter([
                    $vehiculo->marca?->nombre,
                    $vehiculo->modelo?->nombre,
                    $vehiculo->anio ? (string) $vehiculo->anio : null,
                ])));

                return [
                    'id' => $vehiculo->id,
                    'placa' => $vehiculo->placa,
                    'label' => $label !== '' ? $label : 'Vehículo',
                    'cliente' => trim(implode(' ', array_filter([
                        $vehiculo->cliente?->nombres,
                        $vehiculo->cliente?->apellidos,
                    ]))),
                    'poliza' => $vehiculo->numero_poliza,
                    'cobertura_pct' => $vehiculo->cobertura_pct,
                    'aseguradora' => $vehiculo->aseguradora?->nombre,
                    'ordenes' => $ordenes
                        ->where('vehiculo_id', $vehiculo->id)
                        ->values()
                        ->map(fn (OrdenTrabajo $orden): array => [
                            'numero' => $orden->numero,
                            'estado' => $orden->estado,
                            'total' => (string) $orden->total,
                            'ingreso_at' => optional($orden->ingreso_at)?->toIso8601String(),
                            'url' => $orden->public_token ? url('/ot/'.$orden->public_token) : null,
                            'siniestro' => $orden->siniestro === null ? null : [
                                'numero' => $orden->siniestro->numero,
                                'estado' => $orden->siniestro->estado,
                                'aseguradora' => $orden->siniestro->aseguradora?->nombre,
                                'monto_reclamado' => (string) $orden->siniestro->monto_reclamado,
                                'monto_seguro' => (string) $orden->siniestro->monto_seguro,
                                'monto_cliente' => (string) $orden->siniestro->monto_cliente,
                            ],
                        ]),
                    'presupuestos' => $presupuestos
                        ->where('vehiculo_id', $vehiculo->id)
                        ->values()
                        ->map(fn (Presupuesto $presupuesto): array => [
                            'numero' => $presupuesto->numero,
                            'estado' => $presupuesto->estado,
                            'total' => (string) $presupuesto->total,
                            'created_at' => optional($presupuesto->created_at)?->toIso8601String(),
                            'url' => $presupuesto->public_token ? url('/p/'.$presupuesto->public_token) : null,
                        ]),
                ];
            })->values(),
        ]);
    }

    public static function normalize(string $placa): string
    {
        return strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $placa));
    }
}
