<?php

declare(strict_types=1);

namespace App\Services\Taller;

use App\Models\OrdenTrabajo;
use App\Models\OrdenTrabajoLinea;
use App\Models\Producto;
use App\Models\Servicio;
use App\Models\TallerSetting;
use Illuminate\Validation\ValidationException;

final class OrdenTrabajoLineasService
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
    public function sync(OrdenTrabajo $orden, array $lineas): void
    {
        $normalizadas = $this->normalizar($lineas);

        $orden->lineas()->delete();

        foreach ($normalizadas as $i => $linea) {
            OrdenTrabajoLinea::query()->create([
                'orden_trabajo_id' => $orden->id,
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

        $this->recalcTotales($orden);
    }

    public function recalcTotales(OrdenTrabajo $orden): void
    {
        $settings = TallerSetting::current();
        $igvPct = (float) $settings->igv_porcentaje;
        $incluyeIgv = (bool) $settings->precio_incluye_igv;

        $suma = round((float) $orden->lineas()->sum('subtotal'), 2);

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

        $pagado = round((float) $orden->pagado_total, 2);
        $saldo = round(max(0, $total - $pagado), 2);

        $orden->subtotal = number_format($subtotal, 2, '.', '');
        $orden->igv_total = number_format($igv, 2, '.', '');
        $orden->total = number_format($total, 2, '.', '');
        $orden->saldo = number_format($saldo, 2, '.', '');
        $orden->save();
    }

    /**
     * @param  list<array<string, mixed>>  $lineas
     * @return list<array{tipo: string, servicio_id: string|null, producto_id: string|null, descripcion: string, cantidad: float, precio_unitario: float, subtotal: float}>
     */
    private function normalizar(array $lineas): array
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

            $tipo = OrdenTrabajoLinea::TIPO_OTRO;
            if ($servicioId !== null) {
                $tipo = OrdenTrabajoLinea::TIPO_SERVICIO;
            } elseif ($productoId !== null) {
                $tipo = OrdenTrabajoLinea::TIPO_PRODUCTO;
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
}
