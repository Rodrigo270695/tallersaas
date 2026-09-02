<?php

declare(strict_types=1);

namespace App\Services\Taller;

use App\Models\OrdenTrabajo;
use App\Models\Presupuesto;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class CrearPresupuestoDesdeOrdenService
{
    public function __construct(
        private readonly PresupuestoLineasService $lineas,
    ) {}

    public function crear(OrdenTrabajo $orden): Presupuesto
    {
        if ($orden->estado === OrdenTrabajo::ESTADO_ANULADA) {
            throw ValidationException::withMessages([
                'orden' => 'No puedes crear un presupuesto desde una orden anulada.',
            ]);
        }

        return DB::transaction(function () use ($orden): Presupuesto {
            $orden->loadMissing('lineas');

            $presupuesto = Presupuesto::query()->create([
                'sede_id' => $orden->sede_id,
                'numero' => Presupuesto::generateNextNumber(),
                'cliente_id' => $orden->cliente_id,
                'vehiculo_id' => $orden->vehiculo_id,
                'orden_trabajo_id' => $orden->id,
                'estado' => Presupuesto::ESTADO_BORRADOR,
                'diagnostico' => $orden->diagnostico,
                'notas_internas' => $orden->notas_internas,
                'valido_hasta' => now()->addDays(7)->toDateString(),
                'created_by_id' => Auth::id(),
            ]);

            $payload = $orden->lineas->map(fn ($linea) => [
                'servicio_id' => $linea->servicio_id,
                'producto_id' => $linea->producto_id,
                'descripcion' => $linea->descripcion,
                'cantidad' => (float) $linea->cantidad,
                'precio_unitario' => (float) $linea->precio_unitario,
            ])->all();

            if ($payload !== []) {
                $this->lineas->sync($presupuesto, $payload);
            }

            return $presupuesto->refresh()->load('items');
        });
    }
}
