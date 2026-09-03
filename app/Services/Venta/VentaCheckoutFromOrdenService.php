<?php

declare(strict_types=1);

namespace App\Services\Venta;

use App\Models\CajaSesion;
use App\Models\OrdenTrabajo;
use App\Models\Producto;
use App\Models\Servicio;
use App\Models\TallerSetting;
use App\Models\Venta;
use App\Models\VentaLinea;
use App\Models\VentaPago;
use App\Services\Inventario\InventarioStockService;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class VentaCheckoutFromOrdenService
{
    public function __construct(private readonly InventarioStockService $stock) {}

    /**
     * @param  array{
     *     lineas: list<array{concepto: string, cantidad: float|int|string, precio_unitario: float|int|string, producto_id?: string|null, servicio_id?: string|null}>,
     *     pagos: list<array{metodo: string, monto: float|int|string, monto_recibido?: float|int|string|null}>,
     *     caja_sesion_id?: string|null,
     *     notas?: string|null,
     *     tipo_comprobante_sunat?: int|string|null
     * }  $payload
     */
    public function cobrar(OrdenTrabajo $orden, array $payload, Authenticatable $user): Venta
    {
        return DB::transaction(function () use ($orden, $payload, $user): Venta {
            /** @var OrdenTrabajo $ordenLocked */
            $ordenLocked = OrdenTrabajo::query()
                ->whereKey($orden->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($ordenLocked->estado === OrdenTrabajo::ESTADO_ANULADA) {
                throw ValidationException::withMessages([
                    'orden_trabajo' => 'No se puede cobrar una orden anulada.',
                ]);
            }

            $sesion = $this->resolveSesion($payload['caja_sesion_id'] ?? null, $user);

            if ((string) $sesion->sede_id !== (string) $ordenLocked->sede_id) {
                throw ValidationException::withMessages([
                    'caja_sesion_id' => 'La caja abierta no corresponde a la sede de esta orden.',
                ]);
            }

            $settings = TallerSetting::current();
            $igvPct = $settings->igvPorcentajeEfectivo();
            $incluyeIgv = (bool) $settings->precio_incluye_igv && $igvPct > 0;
            $moneda = $settings->moneda === 'USD' ? 'USD' : 'PEN';

            $lineasCalc = $this->calcularLineas($payload['lineas'], $incluyeIgv);
            $totales = $this->calcularTotales($lineasCalc, $igvPct, $incluyeIgv);
            $total = $totales['total'];

            if ($total < 0.01) {
                throw ValidationException::withMessages([
                    'lineas' => 'El total a cobrar debe ser mayor a cero.',
                ]);
            }

            $pagos = $this->normalizarPagos($payload['pagos'], $total);
            $metodo = count($pagos) === 1 ? $pagos[0]['metodo'] : 'mixto';
            $efectivoSnap = $this->efectivoSnapshot($pagos);

            $venta = Venta::query()->create([
                'numero' => Venta::generateNextNumber(),
                'sede_id' => $sesion->sede_id,
                'caja_sesion_id' => $sesion->id,
                'cliente_id' => $ordenLocked->cliente_id,
                'vehiculo_id' => $ordenLocked->vehiculo_id,
                'orden_trabajo_id' => $ordenLocked->id,
                'moneda' => $moneda,
                'estado' => Venta::ESTADO_PAGADO,
                'subtotal' => number_format($totales['subtotal'], 2, '.', ''),
                'igv_monto' => number_format($totales['igv'], 2, '.', ''),
                'descuento_monto' => '0.00',
                'total' => number_format($total, 2, '.', ''),
                'metodo_pago' => $metodo,
                'monto_recibido' => $efectivoSnap['monto_recibido'] !== null
                    ? number_format($efectivoSnap['monto_recibido'], 2, '.', '')
                    : null,
                'vuelto' => $efectivoSnap['vuelto'] !== null
                    ? number_format($efectivoSnap['vuelto'], 2, '.', '')
                    : null,
                'fecha_pago' => now(),
                'notas' => isset($payload['notas']) ? trim((string) $payload['notas']) ?: null : null,
                'created_by_id' => $user->getAuthIdentifier(),
                'tipo_comprobante_sunat' => $this->tipoComprobanteSunat($payload['tipo_comprobante_sunat'] ?? null),
            ]);

            $stock = $this->stock;

            foreach ($lineasCalc as $i => $linea) {
                VentaLinea::query()->create([
                    'venta_id' => $venta->id,
                    'producto_id' => $linea['producto_id'],
                    'servicio_id' => $linea['servicio_id'],
                    'tipo_linea' => $linea['producto_id'] !== null ? 'producto' : 'servicio',
                    'descripcion' => $linea['concepto'],
                    'cantidad' => number_format($linea['cantidad'], 3, '.', ''),
                    'precio_unitario' => number_format($linea['precio_unitario'], 4, '.', ''),
                    'descuento_importe' => '0.00',
                    'subtotal' => number_format($linea['subtotal'], 2, '.', ''),
                    'orden' => $i,
                ]);

                if ($linea['producto_id'] !== null) {
                    $stock->registrarSalida(
                        $linea['producto_id'],
                        (string) $sesion->sede_id,
                        (string) $linea['cantidad'],
                        'Salida por cobro de '.$ordenLocked->numero,
                        (string) $user->getAuthIdentifier(),
                        (string) $venta->id,
                    );
                }
            }

            foreach ($pagos as $i => $pago) {
                VentaPago::query()->create([
                    'venta_id' => $venta->id,
                    'metodo' => $pago['metodo'],
                    'monto' => number_format($pago['monto'], 2, '.', ''),
                    'monto_recibido' => $pago['monto_recibido'] !== null
                        ? number_format($pago['monto_recibido'], 2, '.', '')
                        : null,
                    'vuelto' => $pago['vuelto'] !== null
                        ? number_format($pago['vuelto'], 2, '.', '')
                        : null,
                    'orden' => $i,
                ]);
            }

            $this->aplicarPagoEnOrden($ordenLocked, $totales, $total);

            return $venta->fresh(['lineas', 'pagos']) ?? $venta;
        });
    }

    /**
     * Venta de mostrador (sin OT): repuestos/servicios sueltos.
     *
     * @param  array{
     *     cliente_id?: string|null,
     *     vehiculo_id?: string|null,
     *     lineas: list<array{concepto: string, cantidad: float|int|string, precio_unitario: float|int|string, producto_id?: string|null, servicio_id?: string|null}>,
     *     pagos: list<array{metodo: string, monto: float|int|string, monto_recibido?: float|int|string|null}>,
     *     caja_sesion_id?: string|null,
     *     notas?: string|null,
     *     tipo_comprobante_sunat?: int|string|null
     * }  $payload
     */
    public function cobrarDirecto(array $payload, Authenticatable $user): Venta
    {
        return DB::transaction(function () use ($payload, $user): Venta {
            $sesion = $this->resolveSesion($payload['caja_sesion_id'] ?? null, $user);

            $settings = TallerSetting::current();
            $igvPct = $settings->igvPorcentajeEfectivo();
            $incluyeIgv = (bool) $settings->precio_incluye_igv && $igvPct > 0;
            $moneda = $settings->moneda === 'USD' ? 'USD' : 'PEN';

            $lineasCalc = $this->calcularLineas($payload['lineas'], $incluyeIgv);
            $totales = $this->calcularTotales($lineasCalc, $igvPct, $incluyeIgv);
            $total = $totales['total'];

            if ($total < 0.01) {
                throw ValidationException::withMessages([
                    'lineas' => 'El total a cobrar debe ser mayor a cero.',
                ]);
            }

            $clienteId = isset($payload['cliente_id']) && is_string($payload['cliente_id']) && $payload['cliente_id'] !== ''
                ? $payload['cliente_id']
                : null;
            $vehiculoId = isset($payload['vehiculo_id']) && is_string($payload['vehiculo_id']) && $payload['vehiculo_id'] !== ''
                ? $payload['vehiculo_id']
                : null;

            if ($vehiculoId !== null && $clienteId === null) {
                throw ValidationException::withMessages([
                    'cliente_id' => 'Selecciona el cliente del vehículo.',
                ]);
            }

            $pagos = $this->normalizarPagos($payload['pagos'], $total);
            $metodo = count($pagos) === 1 ? $pagos[0]['metodo'] : 'mixto';
            $efectivoSnap = $this->efectivoSnapshot($pagos);

            $venta = Venta::query()->create([
                'numero' => Venta::generateNextNumber(),
                'sede_id' => $sesion->sede_id,
                'caja_sesion_id' => $sesion->id,
                'cliente_id' => $clienteId,
                'vehiculo_id' => $vehiculoId,
                'orden_trabajo_id' => null,
                'moneda' => $moneda,
                'estado' => Venta::ESTADO_PAGADO,
                'subtotal' => number_format($totales['subtotal'], 2, '.', ''),
                'igv_monto' => number_format($totales['igv'], 2, '.', ''),
                'descuento_monto' => '0.00',
                'total' => number_format($total, 2, '.', ''),
                'metodo_pago' => $metodo,
                'monto_recibido' => $efectivoSnap['monto_recibido'] !== null
                    ? number_format($efectivoSnap['monto_recibido'], 2, '.', '')
                    : null,
                'vuelto' => $efectivoSnap['vuelto'] !== null
                    ? number_format($efectivoSnap['vuelto'], 2, '.', '')
                    : null,
                'fecha_pago' => now(),
                'notas' => isset($payload['notas']) ? trim((string) $payload['notas']) ?: null : null,
                'created_by_id' => $user->getAuthIdentifier(),
                'tipo_comprobante_sunat' => $this->tipoComprobanteSunat($payload['tipo_comprobante_sunat'] ?? null),
            ]);

            $stock = $this->stock;

            foreach ($lineasCalc as $i => $linea) {
                VentaLinea::query()->create([
                    'venta_id' => $venta->id,
                    'producto_id' => $linea['producto_id'],
                    'servicio_id' => $linea['servicio_id'],
                    'tipo_linea' => $linea['producto_id'] !== null ? 'producto' : 'servicio',
                    'descripcion' => $linea['concepto'],
                    'cantidad' => number_format($linea['cantidad'], 3, '.', ''),
                    'precio_unitario' => number_format($linea['precio_unitario'], 4, '.', ''),
                    'descuento_importe' => '0.00',
                    'subtotal' => number_format($linea['subtotal'], 2, '.', ''),
                    'orden' => $i,
                ]);

                if ($linea['producto_id'] !== null) {
                    $stock->registrarSalida(
                        $linea['producto_id'],
                        (string) $sesion->sede_id,
                        (string) $linea['cantidad'],
                        'Salida por venta '.$venta->numero,
                        (string) $user->getAuthIdentifier(),
                        (string) $venta->id,
                    );
                }
            }

            foreach ($pagos as $i => $pago) {
                VentaPago::query()->create([
                    'venta_id' => $venta->id,
                    'metodo' => $pago['metodo'],
                    'monto' => number_format($pago['monto'], 2, '.', ''),
                    'monto_recibido' => $pago['monto_recibido'] !== null
                        ? number_format($pago['monto_recibido'], 2, '.', '')
                        : null,
                    'vuelto' => $pago['vuelto'] !== null
                        ? number_format($pago['vuelto'], 2, '.', '')
                        : null,
                    'orden' => $i,
                ]);
            }

            return $venta->fresh(['lineas', 'pagos']) ?? $venta;
        });
    }

    private function resolveSesion(?string $sesionId, Authenticatable $user): CajaSesion
    {
        $query = CajaSesion::query()
            ->where('estado', CajaSesion::ESTADO_ABIERTA)
            ->where('opened_by_id', $user->getAuthIdentifier())
            ->lockForUpdate();

        if (is_string($sesionId) && $sesionId !== '') {
            $query->whereKey($sesionId);
        }

        $sesion = $query->first();

        if ($sesion === null) {
            throw ValidationException::withMessages([
                'caja_sesion_id' => 'No tienes una caja abierta. Ábrela antes de cobrar.',
            ]);
        }

        return $sesion;
    }

    /**
     * @param  list<array{concepto: string, cantidad: float|int|string, precio_unitario: float|int|string, producto_id?: string|null, servicio_id?: string|null}>  $lineas
     * @return list<array{concepto: string, cantidad: float, precio_unitario: float, subtotal: float, producto_id: string|null, servicio_id: string|null}>
     */
    private function calcularLineas(array $lineas, bool $incluyeIgv): array
    {
        $out = [];

        foreach ($lineas as $linea) {
            $productoId = isset($linea['producto_id']) && is_string($linea['producto_id']) && $linea['producto_id'] !== ''
                ? $linea['producto_id']
                : null;
            $servicioId = isset($linea['servicio_id']) && is_string($linea['servicio_id']) && $linea['servicio_id'] !== ''
                ? $linea['servicio_id']
                : null;
            $concepto = trim((string) $linea['concepto']);
            $cantidad = round((float) $linea['cantidad'], 3);
            $precio = round((float) $linea['precio_unitario'], 4);

            if ($productoId !== null && $servicioId !== null) {
                throw ValidationException::withMessages([
                    'lineas' => 'Una línea no puede ser servicio y repuesto a la vez.',
                ]);
            }

            if ($productoId !== null) {
                $producto = Producto::query()->whereKey($productoId)->where('activo', true)->first();
                if ($producto === null) {
                    throw ValidationException::withMessages([
                        'lineas' => 'Uno de los repuestos no existe o está inactivo.',
                    ]);
                }
                if ($concepto === '') {
                    $concepto = (string) $producto->nombre;
                }
            }

            if ($servicioId !== null) {
                $servicio = Servicio::query()->whereKey($servicioId)->where('activo', true)->first();
                if ($servicio === null) {
                    throw ValidationException::withMessages([
                        'lineas' => 'Uno de los servicios no existe o está inactivo.',
                    ]);
                }
                if ($concepto === '') {
                    $concepto = (string) $servicio->nombre;
                }
            }

            if ($concepto === '' || $cantidad <= 0 || $precio < 0) {
                throw ValidationException::withMessages([
                    'lineas' => 'Cada línea debe tener concepto, cantidad y precio válidos.',
                ]);
            }

            $subtotal = round($cantidad * $precio, 2);
            unset($incluyeIgv);

            $out[] = [
                'concepto' => $concepto,
                'cantidad' => $cantidad,
                'precio_unitario' => $precio,
                'subtotal' => $subtotal,
                'producto_id' => $productoId,
                'servicio_id' => $servicioId,
            ];
        }

        if ($out === []) {
            throw ValidationException::withMessages([
                'lineas' => 'Agrega al menos una línea para cobrar.',
            ]);
        }

        return $out;
    }

    /**
     * @param  list<array{concepto: string, cantidad: float, precio_unitario: float, subtotal: float}>  $lineas
     * @return array{subtotal: float, igv: float, total: float}
     */
    private function calcularTotales(array $lineas, float $igvPct, bool $incluyeIgv): array
    {
        $suma = round(array_sum(array_column($lineas, 'subtotal')), 2);

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

        return [
            'subtotal' => $subtotal,
            'igv' => $igv,
            'total' => $total,
        ];
    }

    /**
     * @param  list<array{metodo: string, monto: float|int|string, monto_recibido?: float|int|string|null}>  $pagos
     * @return list<array{metodo: string, monto: float, monto_recibido: float|null, vuelto: float|null}>
     */
    private function normalizarPagos(array $pagos, float $total): array
    {
        $out = [];
        $suma = 0.0;

        foreach ($pagos as $pago) {
            $metodo = (string) $pago['metodo'];
            if (! in_array($metodo, VentaPago::METODOS, true)) {
                throw ValidationException::withMessages([
                    'pagos' => 'Método de pago no válido.',
                ]);
            }

            $monto = round((float) $pago['monto'], 2);
            if ($monto < 0.01) {
                throw ValidationException::withMessages([
                    'pagos' => 'Cada pago debe ser mayor a cero.',
                ]);
            }

            $recibido = isset($pago['monto_recibido']) && $pago['monto_recibido'] !== null && $pago['monto_recibido'] !== ''
                ? round((float) $pago['monto_recibido'], 2)
                : null;
            $vuelto = null;

            if ($metodo === 'efectivo') {
                if ($recibido === null) {
                    $recibido = $monto;
                }
                if ($recibido + 0.001 < $monto) {
                    throw ValidationException::withMessages([
                        'pagos' => 'El efectivo recibido no cubre el monto a cobrar.',
                    ]);
                }
                $vuelto = round($recibido - $monto, 2);
            }

            $suma = round($suma + $monto, 2);
            $out[] = [
                'metodo' => $metodo,
                'monto' => $monto,
                'monto_recibido' => $recibido,
                'vuelto' => $vuelto,
            ];
        }

        if (abs($suma - $total) > 0.02) {
            throw ValidationException::withMessages([
                'pagos' => 'La suma de los pagos debe coincidir con el total (S/ '.number_format($total, 2).').',
            ]);
        }

        return $out;
    }

    /**
     * @param  list<array{metodo: string, monto: float, monto_recibido: float|null, vuelto: float|null}>  $pagos
     * @return array{monto_recibido: float|null, vuelto: float|null}
     */
    private function efectivoSnapshot(array $pagos): array
    {
        $recibido = 0.0;
        $vuelto = 0.0;
        $hay = false;

        foreach ($pagos as $pago) {
            if ($pago['metodo'] !== 'efectivo') {
                continue;
            }
            $hay = true;
            $recibido += (float) ($pago['monto_recibido'] ?? $pago['monto']);
            $vuelto += (float) ($pago['vuelto'] ?? 0);
        }

        if (! $hay) {
            return ['monto_recibido' => null, 'vuelto' => null];
        }

        return [
            'monto_recibido' => round($recibido, 2),
            'vuelto' => round($vuelto, 2),
        ];
    }

    /**
     * @param  array{subtotal: float, igv: float, total: float}  $totales
     */
    private function aplicarPagoEnOrden(OrdenTrabajo $orden, array $totales, float $cobrado): void
    {
        $totalActual = round((float) $orden->total, 2);

        if ($totalActual < 0.01) {
            $orden->subtotal = number_format($totales['subtotal'], 2, '.', '');
            $orden->igv_total = number_format($totales['igv'], 2, '.', '');
            $orden->total = number_format($totales['total'], 2, '.', '');
            $totalActual = $totales['total'];
        }

        $pagado = round((float) $orden->pagado_total + $cobrado, 2);
        $saldo = round(max(0, $totalActual - $pagado), 2);

        $orden->pagado_total = number_format($pagado, 2, '.', '');
        $orden->saldo = number_format($saldo, 2, '.', '');
        $orden->save();
    }

    private function tipoComprobanteSunat(mixed $valor): ?int
    {
        if ($valor === null || $valor === '' || (int) $valor === 0) {
            return null;
        }

        $tipo = (int) $valor;

        return in_array($tipo, [1, 2], true) ? $tipo : null;
    }
}
