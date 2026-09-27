<?php

namespace App\Support\Taller;

/**
 * Puntos fijos de la inspección de ingreso.
 */
final class InspeccionChecklist
{
    /** @var list<array{clave: string, label: string}> */
    public const ITEMS = [
        ['clave' => 'luces', 'label' => 'Luces'],
        ['clave' => 'frenos', 'label' => 'Frenos'],
        ['clave' => 'neumaticos', 'label' => 'Neumáticos'],
        ['clave' => 'niveles', 'label' => 'Niveles'],
        ['clave' => 'bateria', 'label' => 'Batería'],
        ['clave' => 'fugas', 'label' => 'Fugas'],
        ['clave' => 'parabrisas', 'label' => 'Parabrisas'],
        ['clave' => 'suspension', 'label' => 'Suspensión'],
        ['clave' => 'direccion', 'label' => 'Dirección'],
        ['clave' => 'escape', 'label' => 'Escape'],
    ];

    /** @return list<string> */
    public static function claves(): array
    {
        return array_column(self::ITEMS, 'clave');
    }
}
