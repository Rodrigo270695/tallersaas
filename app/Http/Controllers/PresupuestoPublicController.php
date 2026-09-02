<?php

namespace App\Http\Controllers;

use App\Http\Requests\RechazarPresupuestoRequest;
use App\Models\Presupuesto;
use App\Models\TallerSetting;
use App\Services\Taller\AplicarPresupuestoAOrdenService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PresupuestoPublicController extends Controller
{
    public function show(string $token): Response
    {
        $presupuesto = $this->findByToken($token);
        $presupuesto->sincronizarVencimiento();
        $presupuesto->load([
            'cliente:id,nombres,apellidos',
            'vehiculo:id,placa,marca,modelo',
            'items',
        ]);

        $settings = TallerSetting::current();

        return Inertia::render('public/presupuesto', [
            'presupuesto' => [
                'numero' => $presupuesto->numero,
                'estado' => $presupuesto->estado,
                'diagnostico' => $presupuesto->diagnostico,
                'subtotal' => $presupuesto->subtotal,
                'igv_total' => $presupuesto->igv_total,
                'total' => $presupuesto->total,
                'valido_hasta' => optional($presupuesto->valido_hasta)->toDateString(),
                'cliente_nombre' => $presupuesto->cliente?->nombreCompleto(),
                'vehiculo_label' => $this->vehiculoLabel($presupuesto),
                'items' => $presupuesto->items->map(fn ($item) => [
                    'descripcion' => $item->descripcion,
                    'cantidad' => $item->cantidad,
                    'precio_unitario' => $item->precio_unitario,
                    'subtotal' => $item->subtotal,
                ])->values(),
                'puede_responder' => $presupuesto->puedeAprobarse(),
            ],
            'taller' => [
                'nombre' => trim((string) ($settings->nombre_comercial ?: $settings->razon_social ?: 'Taller')),
                'telefono' => $settings->telefono_principal,
                'moneda' => $settings->moneda,
                'precio_incluye_igv' => (bool) $settings->precio_incluye_igv,
            ],
            'token' => $token,
        ]);
    }

    public function aprobar(string $token, AplicarPresupuestoAOrdenService $service): RedirectResponse
    {
        $presupuesto = $this->findByToken($token);
        $service->aprobar($presupuesto);

        Inertia::flash('toast', ['type' => 'success', 'message' => '¡Gracias! Presupuesto aprobado.']);

        return back();
    }

    public function rechazar(string $token, RechazarPresupuestoRequest $request, AplicarPresupuestoAOrdenService $service): RedirectResponse
    {
        $presupuesto = $this->findByToken($token);
        $service->rechazar($presupuesto, $request->validated('motivo'));

        Inertia::flash('toast', ['type' => 'info', 'message' => 'Presupuesto rechazado. Gracias por avisarnos.']);

        return back();
    }

    private function findByToken(string $token): Presupuesto
    {
        return Presupuesto::query()
            ->where('public_token', $token)
            ->firstOrFail();
    }

    private function vehiculoLabel(Presupuesto $presupuesto): string
    {
        $placa = trim((string) ($presupuesto->vehiculo?->placa ?? ''));
        $label = trim(implode(' ', array_filter([
            $presupuesto->vehiculo?->marca,
            $presupuesto->vehiculo?->modelo,
            $placa !== '' ? $placa : null,
        ])));

        return $label !== '' ? $label : 'Vehículo';
    }
}
