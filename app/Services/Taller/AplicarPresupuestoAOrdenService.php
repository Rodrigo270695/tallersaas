<?php

declare(strict_types=1);

namespace App\Services\Taller;

use App\Models\OrdenTrabajo;
use App\Models\Presupuesto;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class AplicarPresupuestoAOrdenService
{
    public function __construct(
        private readonly PresupuestoLineasService $lineas,
        private readonly OrdenTrabajoLineasService $ordenLineas,
    ) {}

    public function aplicar(Presupuesto $presupuesto): OrdenTrabajo
    {
        $presupuesto->sincronizarVencimiento();
        $presupuesto->refresh();

        if ($presupuesto->estado !== Presupuesto::ESTADO_APROBADO) {
            throw ValidationException::withMessages([
                'presupuesto' => 'Solo puedes aplicar un presupuesto aprobado.',
            ]);
        }

        if ($presupuesto->convertido_at !== null) {
            throw ValidationException::withMessages([
                'presupuesto' => 'Este presupuesto ya se aplicó a la orden.',
            ]);
        }

        $ordenId = $presupuesto->orden_trabajo_id;
        if ($ordenId === null) {
            throw ValidationException::withMessages([
                'presupuesto' => 'El presupuesto no está vinculado a una orden de trabajo.',
            ]);
        }

        return DB::transaction(function () use ($presupuesto, $ordenId): OrdenTrabajo {
            $orden = OrdenTrabajo::query()->whereKey($ordenId)->lockForUpdate()->firstOrFail();

            if ($orden->estado === OrdenTrabajo::ESTADO_ANULADA) {
                throw ValidationException::withMessages([
                    'orden' => 'No puedes aplicar el presupuesto a una orden anulada.',
                ]);
            }

            $payload = $this->lineas->lineasToOrdenPayload($presupuesto);
            if ($payload === []) {
                throw ValidationException::withMessages([
                    'presupuesto' => 'El presupuesto no tiene líneas para aplicar.',
                ]);
            }

            $this->ordenLineas->sync($orden, $payload);

            if ($presupuesto->diagnostico !== null && trim($presupuesto->diagnostico) !== '') {
                $orden->diagnostico = $presupuesto->diagnostico;
            }

            $orden->presupuesto_id = $presupuesto->id;
            $orden->save();

            $presupuesto->forceFill([
                'estado' => Presupuesto::ESTADO_CONVERTIDO,
                'convertido_at' => now(),
            ])->save();

            return $orden->refresh();
        });
    }

    public function aprobar(Presupuesto $presupuesto): Presupuesto
    {
        $presupuesto->sincronizarVencimiento();
        $presupuesto->refresh();

        if (! $presupuesto->puedeAprobarse()) {
            throw ValidationException::withMessages([
                'presupuesto' => 'Este presupuesto no se puede aprobar.',
            ]);
        }

        $presupuesto->forceFill([
            'estado' => Presupuesto::ESTADO_APROBADO,
            'aprobado_at' => now(),
            'rechazado_at' => null,
            'rechazo_motivo' => null,
        ])->save();

        return $presupuesto->refresh();
    }

    public function rechazar(Presupuesto $presupuesto, ?string $motivo = null): Presupuesto
    {
        $presupuesto->sincronizarVencimiento();
        $presupuesto->refresh();

        if (! in_array($presupuesto->estado, [Presupuesto::ESTADO_ENVIADO, Presupuesto::ESTADO_BORRADOR], true)) {
            throw ValidationException::withMessages([
                'presupuesto' => 'Este presupuesto no se puede rechazar.',
            ]);
        }

        $presupuesto->forceFill([
            'estado' => Presupuesto::ESTADO_RECHAZADO,
            'rechazado_at' => now(),
            'rechazo_motivo' => $motivo !== null && trim($motivo) !== '' ? trim($motivo) : null,
        ])->save();

        return $presupuesto->refresh();
    }
}
