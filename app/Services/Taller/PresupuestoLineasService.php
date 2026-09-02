<?php

declare(strict_types=1);

namespace App\Services\Taller;

use App\Models\Presupuesto;
use App\Models\PresupuestoItem;
use App\Models\Producto;
use App\Models\Servicio;
use App\Models\TallerSetting;
use Illuminate\Validation\ValidationException;

final class PresupuestoLineasService
{
    /**
     * @param  list<array{
     *     servicio_id?: string|null,
     *     producto_id?: string|null,
     *     descripcion?: string|null,
     *     cantidad?: float|int|string|null,
     *     precio_unitario?: float|int|string|null
     * }>  $lineas
     */
    public function sync(Presupuesto $presupuesto, array $lineas): void
    {
        $normalizadas = $this->normalizar($lineas);

        $presupuesto->items()->delete();

        foreach ($normalizadas as $i => $linea) {
            PresupuestoItem::query()->create([
                'presupuesto_id' => $presupuesto->id,
                'tipo' => $linea['tipo'],
                'servicio_id' => $linea['servicio_id'],
                'producto_id' => $linea['producto_id'],
                'descripcion' => $linea['descripcion'],
                'cantidad' => number_format($linea['cantidad'], 3, '.', ''),
                'precio_unitario' => number_format($linea['precio_unitario'], 4, '.', ''),
                'subtotal' => number_format($linea['subtotal'], 2, '.', ''),
                'orden' => $i,
            ]);
        }

        $this->recalcTotales($presupuesto);
    }

    public function recalcTotales(Presupuesto $presupuesto): void
    {
        $settings = TallerSetting::current();
        $igvPct = (float) $settings->igv_porcentaje;
        $incluyeIgv = (bool) $settings->precio_incluye_igv;

        $suma = round((float) $presupuesto->items()->sum('subtotal'), 2);

        if ($incluyeIgv) {
            $divisor = 1 + ($igvPct / 100);
            $total = $suma;
            $igv = $divisor > 0 ? round($total - ($total / $divisor), 2) : 0.0;
            $subtotal = round($total - $igv, 2);
        } else {
            $subtotal = $suma;
            $igv = round($subtotal * ($igvPct / 100), 2);
            $total = round($subtotal + $igv, 2);
        }

        $presupuesto->subtotal = number_format($subtotal, 2, '.', '');
        $presupuesto->igv_total = number_format($igv, 2, '.', '');
        $presupuesto->total = number_format($total, 2, '.', '');
        $presupuesto->save();
    }

    /**
     * @return list<array{tipo: string, servicio_id: string|null, producto_id: string|null, descripcion: string, cantidad: float, precio_unitario: float, subtotal: float}>
     */
    public function normalizar(array $lineas): array
    {
        $out = [];

        foreach ($lineas as $linea) {
            if (! is_array($linea)) {
                continue;
            }

            $servicioId = isset($linea['servicio_id']) && is_string($linea['servicio_id']) && $linea['servicio_id'] !== ''
                ? $linea['servicio_id']
                : null;
            $productoId = isset($linea['producto_id']) && is_string($linea['producto_id']) && $linea['producto_id'] !== ''
                ? $linea['producto_id']
                : null;

            if ($servicioId !== null && $productoId !== null) {
                throw ValidationException::withMessages([
                    'lineas' => 'Una línea no puede ser servicio y repuesto a la vez.',
                ]);
            }

            $descripcion = trim((string) ($linea['descripcion'] ?? ''));
            $cantidad = round((float) ($linea['cantidad'] ?? 1), 3);
            $precio = isset($linea['precio_unitario']) && $linea['precio_unitario'] !== '' && $linea['precio_unitario'] !== null
                ? round((float) $linea['precio_unitario'], 4)
                : null;

            if ($servicioId !== null) {
                $servicio = Servicio::query()->whereKey($servicioId)->where('activo', true)->first();
                if ($servicio === null) {
                    throw ValidationException::withMessages([
                        'lineas' => 'Uno de los servicios no existe o está inactivo.',
                    ]);
                }
                if ($descripcion === '') {
                    $descripcion = (string) $servicio->nombre;
                }
                if ($precio === null) {
                    $precio = round((float) $servicio->precio, 4);
                }
            }

            if ($productoId !== null) {
                $producto = Producto::query()->whereKey($productoId)->where('activo', true)->first();
                if ($producto === null) {
                    throw ValidationException::withMessages([
                        'lineas' => 'Uno de los repuestos no existe o está inactivo.',
                    ]);
                }
                if ($descripcion === '') {
                    $descripcion = (string) $producto->nombre;
                }
                if ($precio === null) {
                    $precio = round((float) ($producto->precio_venta ?? 0), 4);
                }
            }

            if ($descripcion === '' && $servicioId === null && $productoId === null) {
                continue;
            }

            if ($descripcion === '' || $cantidad <= 0 || $precio === null || $precio < 0) {
                throw ValidationException::withMessages([
                    'lineas' => 'Cada línea debe tener descripción, cantidad y precio válidos.',
                ]);
            }

            $tipo = PresupuestoItem::TIPO_OTRO;
            if ($servicioId !== null) {
                $tipo = PresupuestoItem::TIPO_SERVICIO;
            } elseif ($productoId !== null) {
                $tipo = PresupuestoItem::TIPO_PRODUCTO;
            }

            $out[] = [
                'tipo' => $tipo,
                'servicio_id' => $servicioId,
                'producto_id' => $productoId,
                'descripcion' => $descripcion,
                'cantidad' => $cantidad,
                'precio_unitario' => $precio,
                'subtotal' => round($cantidad * $precio, 2),
            ];
        }

        return $out;
    }

    /**
     * @return list<array{servicio_id?: string|null, producto_id?: string|null, descripcion: string, cantidad: float, precio_unitario: float}>
     */
    public function lineasFromOrden(Presupuesto $presupuesto): array
    {
        $orden = $presupuesto->ordenTrabajo;
        if ($orden === null) {
            return [];
        }

        $orden->loadMissing('lineas');

        return $orden->lineas->map(fn ($linea) => [
            'servicio_id' => $linea->servicio_id,
            'producto_id' => $linea->producto_id,
            'descripcion' => $linea->descripcion,
            'cantidad' => (float) $linea->cantidad,
            'precio_unitario' => (float) $linea->precio_unitario,
        ])->all();
    }

    /**
     * @return list<array{servicio_id?: string|null, producto_id?: string|null, descripcion: string, cantidad: float, precio_unitario: float}>
     */
    public function lineasToOrdenPayload(Presupuesto $presupuesto): array
    {
        $presupuesto->loadMissing('items');

        return $presupuesto->items->map(fn (PresupuestoItem $item) => [
            'servicio_id' => $item->servicio_id,
            'producto_id' => $item->producto_id,
            'descripcion' => $item->descripcion,
            'cantidad' => (float) $item->cantidad,
            'precio_unitario' => (float) $item->precio_unitario,
        ])->all();
    }
}
