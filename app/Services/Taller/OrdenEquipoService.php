<?php

declare(strict_types=1);

namespace App\Services\Taller;

use App\Models\OrdenTrabajo;
use App\Models\OrdenTrabajoChecklist;
use App\Models\OrdenTrabajoMecanico;
use App\Models\Puesto;
use App\Support\Taller\InspeccionChecklist;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class OrdenEquipoService
{
    /**
     * @param  list<array{user_id: string, rol: string}>  $mecanicos
     * @param  list<array{clave: string, estado: string, nota: ?string}>  $checklist
     */
    public function sync(
        OrdenTrabajo $orden,
        ?string $puestoId,
        array $mecanicos,
        array $checklist,
        bool $puedeEquipo,
        bool $puedeChecklist,
        ?string $userId,
    ): void {
        if ($orden->estado === OrdenTrabajo::ESTADO_ANULADA) {
            throw ValidationException::withMessages([
                'orden' => 'No se puede modificar una orden anulada.',
            ]);
        }

        DB::transaction(function () use ($orden, $puestoId, $mecanicos, $checklist, $puedeEquipo, $puedeChecklist, $userId): void {
            if ($puedeEquipo) {
                $this->syncPuesto($orden, $puestoId);
                $this->syncMecanicos($orden, $mecanicos);
            }

            if ($puedeChecklist) {
                $this->syncChecklist($orden, $checklist, $userId);
            }
        });
    }

    private function syncPuesto(OrdenTrabajo $orden, ?string $puestoId): void
    {
        if ($puestoId !== null && $puestoId !== '') {
            $puesto = Puesto::query()->whereKey($puestoId)->where('activo', true)->first();
            if (! $puesto instanceof Puesto || (string) $puesto->sede_id !== (string) $orden->sede_id) {
                throw ValidationException::withMessages([
                    'puesto_id' => 'El puesto no pertenece a la sede de esta orden.',
                ]);
            }
        }

        $orden->puesto_id = $puestoId !== '' ? $puestoId : null;
        $orden->save();
    }

    /**
     * @param  list<array{user_id: string, rol: string}>  $mecanicos
     */
    private function syncMecanicos(OrdenTrabajo $orden, array $mecanicos): void
    {
        $responsables = 0;
        $vistos = [];

        foreach ($mecanicos as $fila) {
            $userId = (string) $fila['user_id'];
            if (isset($vistos[$userId])) {
                throw ValidationException::withMessages([
                    'mecanicos' => 'Cada persona solo puede tener un rol en la orden.',
                ]);
            }
            $vistos[$userId] = true;
            if ($fila['rol'] === OrdenTrabajoMecanico::ROL_RESPONSABLE) {
                $responsables++;
            }
        }

        if ($responsables > 1) {
            throw ValidationException::withMessages([
                'mecanicos' => 'Solo puede haber un mecánico responsable.',
            ]);
        }

        $orden->mecanicos()->delete();

        foreach ($mecanicos as $fila) {
            $orden->mecanicos()->create([
                'user_id' => $fila['user_id'],
                'rol' => $fila['rol'],
            ]);
        }
    }

    /**
     * @param  list<array{clave: string, estado: string, nota: ?string}>  $checklist
     */
    private function syncChecklist(OrdenTrabajo $orden, array $checklist, ?string $userId): void
    {
        $permitidas = InspeccionChecklist::claves();

        foreach ($checklist as $fila) {
            if (! in_array($fila['clave'], $permitidas, true)) {
                continue;
            }

            OrdenTrabajoChecklist::query()->updateOrCreate(
                [
                    'orden_trabajo_id' => $orden->id,
                    'clave' => $fila['clave'],
                ],
                [
                    'estado' => $fila['estado'],
                    'nota' => $fila['nota'],
                    'updated_by_id' => $userId,
                ],
            );
        }
    }
}
