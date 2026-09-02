<?php

declare(strict_types=1);

namespace App\Services\Taller;

use App\Models\Cita;
use App\Models\OrdenTrabajo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class ConvertCitaAOrdenService
{
    public function convertir(Cita $cita): OrdenTrabajo
    {
        if (! $cita->puedeConvertirse()) {
            throw ValidationException::withMessages([
                'cita' => 'Esta cita ya no se puede convertir en orden de trabajo.',
            ]);
        }

        return DB::transaction(function () use ($cita): OrdenTrabajo {
            $locked = Cita::query()->whereKey($cita->id)->lockForUpdate()->firstOrFail();

            if (! $locked->puedeConvertirse()) {
                throw ValidationException::withMessages([
                    'cita' => 'Esta cita ya no se puede convertir en orden de trabajo.',
                ]);
            }

            $orden = OrdenTrabajo::query()->create([
                'sede_id' => $locked->sede_id,
                'numero' => OrdenTrabajo::generateNextNumber(),
                'cliente_id' => $locked->cliente_id,
                'vehiculo_id' => $locked->vehiculo_id,
                'cita_id' => $locked->id,
                'estado' => OrdenTrabajo::ESTADO_ABIERTA,
                'ingreso_at' => now(),
                'solicitud_cliente' => $locked->motivo,
                'notas_internas' => $locked->notas,
                'created_by_id' => Auth::id(),
            ]);

            $locked->estado = Cita::ESTADO_CONVERTIDA;
            $locked->orden_trabajo_id = $orden->id;
            $locked->updated_by_id = Auth::id();
            $locked->save();

            return $orden;
        });
    }
}
