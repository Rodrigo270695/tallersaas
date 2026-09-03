<?php

namespace App\Http\Controllers;

use App\Models\OrdenTrabajo;
use App\Models\TallerSetting;
use Inertia\Inertia;
use Inertia\Response;

class OrdenTrabajoPublicController extends Controller
{
    public function show(string $token): Response
    {
        $orden = OrdenTrabajo::query()
            ->where('public_token', $token)
            ->where('estado', '!=', OrdenTrabajo::ESTADO_ANULADA)
            ->with([
                'cliente:id,nombres,apellidos',
                'vehiculo:id,placa,marca_id,modelo_id',
                'vehiculo.marca:id,nombre',
                'vehiculo.modelo:id,nombre',
                'fotos',
            ])
            ->firstOrFail();

        $settings = TallerSetting::current();

        $timeline = [
            [
                'key' => 'abierta',
                'label' => 'Recepcionada',
                'at' => optional($orden->ingreso_at)?->toIso8601String(),
                'done' => true,
            ],
            [
                'key' => 'en_proceso',
                'label' => 'En taller',
                'at' => in_array($orden->estado, [
                    OrdenTrabajo::ESTADO_EN_PROCESO,
                    OrdenTrabajo::ESTADO_LISTA,
                    OrdenTrabajo::ESTADO_ENTREGADA,
                ], true) ? optional($orden->updated_at)?->toIso8601String() : null,
                'done' => in_array($orden->estado, [
                    OrdenTrabajo::ESTADO_EN_PROCESO,
                    OrdenTrabajo::ESTADO_LISTA,
                    OrdenTrabajo::ESTADO_ENTREGADA,
                ], true),
            ],
            [
                'key' => 'lista',
                'label' => 'Lista para recoger',
                'at' => optional($orden->lista_at)?->toIso8601String(),
                'done' => in_array($orden->estado, [
                    OrdenTrabajo::ESTADO_LISTA,
                    OrdenTrabajo::ESTADO_ENTREGADA,
                ], true),
            ],
            [
                'key' => 'entregada',
                'label' => 'Entregada',
                'at' => optional($orden->entregada_at)?->toIso8601String(),
                'done' => $orden->estado === OrdenTrabajo::ESTADO_ENTREGADA,
            ],
        ];

        return Inertia::render('public/orden-seguimiento', [
            'orden' => [
                'numero' => $orden->numero,
                'estado' => $orden->estado,
                'ingreso_at' => optional($orden->ingreso_at)?->toIso8601String(),
                'prometida_at' => optional($orden->prometida_at)?->toIso8601String(),
                'lista_at' => optional($orden->lista_at)?->toIso8601String(),
                'entregada_at' => optional($orden->entregada_at)?->toIso8601String(),
                'solicitud_cliente' => $orden->solicitud_cliente,
                'cliente_nombre' => $orden->cliente?->nombreCompleto(),
                'vehiculo_label' => $this->vehiculoLabel($orden),
                'timeline' => $timeline,
            ],
            'fotos' => $orden->fotos->map(fn ($foto) => [
                'id' => $foto->id,
                'url' => $foto->url,
                'nota' => $foto->nota,
                'created_at' => optional($foto->created_at)?->toIso8601String(),
            ])->values(),
            'taller' => [
                'nombre' => trim((string) ($settings->nombre_comercial ?: $settings->razon_social ?: 'Taller')),
                'telefono' => $settings->telefono_principal,
                'logo_url' => $settings->logo_url ?? null,
            ],
            'token' => $token,
        ]);
    }

    private function vehiculoLabel(OrdenTrabajo $orden): string
    {
        $parts = array_filter([
            $orden->vehiculo?->placa,
            $orden->vehiculo?->marca?->nombre,
            $orden->vehiculo?->modelo?->nombre,
        ]);

        return $parts !== [] ? implode(' · ', $parts) : 'Vehículo';
    }
}
