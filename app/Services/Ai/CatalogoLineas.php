<?php

namespace App\Services\Ai;

/**
 * Cruza lo que devolvió el modelo con el catálogo real del taller.
 * El precio sale de la base, no del texto del modelo.
 */
final class CatalogoLineas
{
    /**
     * @param  list<array<string, mixed>>  $lineas
     * @param  array<string, array{nombre: string, precio: string}>  $servicios
     * @param  array<string, array{nombre: string, precio: string, stock: string}>  $productos
     * @return list<array{servicio_id: string, producto_id: string, descripcion: string, cantidad: string, precio_unitario: string, stock: ?string, comprar: bool}>
     */
    public static function materializar(array $lineas, array $servicios, array $productos, bool $soloProductos = false): array
    {
        $out = [];

        foreach (array_slice($lineas, 0, 12) as $linea) {
            if (! is_array($linea)) {
                continue;
            }

            $id = trim((string) ($linea['catalogo_id'] ?? ''));
            $descripcion = trim((string) ($linea['descripcion'] ?? ''));
            $cantidad = self::cantidad($linea['cantidad'] ?? 1);

            if ($id !== '' && isset($servicios[$id])) {
                if ($soloProductos) {
                    continue;
                }

                $out[] = self::fila(
                    servicioId: $id,
                    productoId: '',
                    descripcion: $servicios[$id]['nombre'],
                    cantidad: $cantidad,
                    precio: $servicios[$id]['precio'],
                    stock: null,
                    comprar: false,
                );

                continue;
            }

            if ($id !== '' && isset($productos[$id])) {
                $stock = (float) $productos[$id]['stock'];
                $comprar = $stock + 0.0001 < (float) $cantidad;

                $out[] = self::fila(
                    servicioId: '',
                    productoId: $id,
                    descripcion: $productos[$id]['nombre'],
                    cantidad: $cantidad,
                    precio: $productos[$id]['precio'],
                    stock: $productos[$id]['stock'],
                    comprar: $comprar,
                );

                continue;
            }

            if ($descripcion === '') {
                continue;
            }

            $out[] = self::fila(
                servicioId: '',
                productoId: '',
                descripcion: $soloProductos ? $descripcion.' · sin stock, comprar' : $descripcion,
                cantidad: $cantidad,
                precio: '0.00',
                stock: null,
                comprar: $soloProductos,
            );
        }

        return $out;
    }

    /**
     * @return array{servicio_id: string, producto_id: string, descripcion: string, cantidad: string, precio_unitario: string, stock: ?string, comprar: bool}
     */
    private static function fila(
        string $servicioId,
        string $productoId,
        string $descripcion,
        string $cantidad,
        string $precio,
        ?string $stock,
        bool $comprar,
    ): array {
        if ($comprar && $productoId !== '' && ! str_contains($descripcion, 'comprar')) {
            $descripcion .= ' · sin stock, comprar';
        }

        return [
            'servicio_id' => $servicioId,
            'producto_id' => $productoId,
            'descripcion' => $descripcion,
            'cantidad' => $cantidad,
            'precio_unitario' => $precio,
            'stock' => $stock,
            'comprar' => $comprar,
        ];
    }

    private static function cantidad(mixed $value): string
    {
        $number = is_numeric($value) ? (float) $value : 1.0;
        $number = max(0.001, min($number, 999));
        $text = number_format($number, 3, '.', '');

        return rtrim(rtrim($text, '0'), '.') ?: '0';
    }
}
