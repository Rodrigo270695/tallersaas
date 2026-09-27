<?php

declare(strict_types=1);

namespace App\Services\Taller;

use App\Models\Vehiculo;
use App\Models\VehiculoKilometraje;

final class VehiculoKilometrajeRecorder
{
    public function record(
        mixed $km,
        string $vehiculoId,
        ?string $ordenId,
        string $origen,
        ?string $userId,
    ): void {
        if ($km === null || $km === '') {
            return;
        }

        $value = (int) $km;
        if ($value < 0) {
            return;
        }

        $last = VehiculoKilometraje::query()
            ->where('vehiculo_id', $vehiculoId)
            ->when(
                $ordenId !== null,
                fn ($query) => $query->where('orden_trabajo_id', $ordenId),
                fn ($query) => $query->whereNull('orden_trabajo_id'),
            )
            ->where('origen', $origen)
            ->orderByDesc('recorded_at')
            ->first();

        if ($last instanceof VehiculoKilometraje && (int) $last->km === $value) {
            return;
        }

        VehiculoKilometraje::query()->create([
            'vehiculo_id' => $vehiculoId,
            'orden_trabajo_id' => $ordenId,
            'km' => $value,
            'origen' => $origen,
            'recorded_at' => now(),
            'user_id' => $userId,
        ]);

        Vehiculo::query()->whereKey($vehiculoId)->update(['kilometraje' => $value]);
    }
}
