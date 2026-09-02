<?php

namespace App\Support\Fel;

use App\Models\Cliente;
use App\Models\FelSerie;

final class FelReceptorResolver
{
    /**
     * @return array{tipo_doc: int, num_doc: string, nombre: string, direccion: string}
     */
    public static function datosReceptor(?Cliente $cliente): array
    {
        $nombre = 'CLIENTES VARIOS';
        $numDoc = '00000000';
        $tipoDoc = 1;
        $direccion = '-';

        if ($cliente !== null) {
            $denominacion = trim($cliente->nombreCompleto());
            if ($denominacion !== '') {
                $nombre = mb_substr($denominacion, 0, 200);
            }

            $digits = preg_replace('/\D+/', '', (string) $cliente->numero_documento) ?? '';
            $tipoDoc = self::tipoDocSunat($cliente, $digits);
            if ($digits !== '') {
                $numDoc = match ($tipoDoc) {
                    6 => strlen($digits) >= 11 ? substr($digits, 0, 11) : $digits,
                    1 => strlen($digits) >= 8 ? substr($digits, 0, 8) : $digits,
                    default => mb_substr($digits, 0, 15),
                };
            }

            $dir = trim((string) ($cliente->direccion ?? ''));
            if ($dir !== '') {
                $direccion = mb_substr($dir, 0, 250);
            }
        }

        return [
            'tipo_doc' => $tipoDoc,
            'num_doc' => $numDoc,
            'nombre' => $nombre,
            'direccion' => $direccion,
        ];
    }

    public static function etiquetaTipo(int $tipoComprobante): string
    {
        return $tipoComprobante === FelSerie::TIPO_FACTURA ? 'factura' : 'boleta';
    }

    private static function tipoDocSunat(Cliente $cliente, string $digits): int
    {
        $tipo = strtoupper(trim((string) ($cliente->tipo_documento ?? '')));

        return match ($tipo) {
            'RUC' => 6,
            'CE' => 4,
            'PAS', 'PASAPORTE' => 7,
            'DNI' => 1,
            default => strlen($digits) === 11 ? 6 : 1,
        };
    }
}
