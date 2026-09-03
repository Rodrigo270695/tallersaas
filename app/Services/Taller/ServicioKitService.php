<?php

namespace App\Services\Taller;

use App\Models\Servicio;
use App\Models\ServicioKitItem;
use Illuminate\Support\Facades\DB;

class ServicioKitService
{
    /**
     * @param  list<array{producto_id: string, cantidad: float|int|string}>|null  $kit
     */
    public function sync(Servicio $servicio, ?array $kit): void
    {
        DB::transaction(function () use ($servicio, $kit): void {
            $servicio->kitItems()->delete();

            if ($kit === null || $kit === []) {
                return;
            }

            $seen = [];
            $orden = 0;

            foreach ($kit as $item) {
                $productoId = (string) ($item['producto_id'] ?? '');
                if ($productoId === '' || isset($seen[$productoId])) {
                    continue;
                }

                $cantidad = round((float) ($item['cantidad'] ?? 0), 3);
                if ($cantidad <= 0) {
                    continue;
                }

                $seen[$productoId] = true;

                ServicioKitItem::query()->create([
                    'servicio_id' => $servicio->id,
                    'producto_id' => $productoId,
                    'cantidad' => $cantidad,
                    'orden' => $orden++,
                ]);
            }
        });
    }

    /**
     * Payload liviano para OT / presupuesto / cobro.
     *
     * @return list<array{id: string, nombre: string, precio: mixed, duracion_minutos: int|null, kit: list<array{producto_id: string, nombre: string, cantidad: mixed, precio_venta: mixed, unidad: string}>}>
     */
    public function catalogoActivos(int $limit = 400): array
    {
        return Servicio::query()
            ->where('activo', true)
            ->with([
                'kitItems' => fn ($q) => $q->orderBy('orden')->with([
                    'producto' => fn ($pq) => $pq->select(['id', 'nombre', 'sku', 'unidad', 'precio_venta', 'activo']),
                ]),
            ])
            ->orderBy('nombre')
            ->limit($limit)
            ->get(['id', 'nombre', 'precio', 'duracion_minutos'])
            ->map(function (Servicio $servicio): array {
                return [
                    'id' => $servicio->id,
                    'nombre' => $servicio->nombre,
                    'precio' => $servicio->precio,
                    'duracion_minutos' => $servicio->duracion_minutos,
                    'kit' => $servicio->kitItems
                        ->filter(fn (ServicioKitItem $item) => $item->producto !== null && $item->producto->activo)
                        ->values()
                        ->map(fn (ServicioKitItem $item): array => [
                            'producto_id' => $item->producto_id,
                            'nombre' => $item->producto->nombre,
                            'cantidad' => $item->cantidad,
                            'precio_venta' => $item->producto->precio_venta,
                            'unidad' => $item->producto->unidad,
                        ])
                        ->all(),
                ];
            })
            ->all();
    }
}
