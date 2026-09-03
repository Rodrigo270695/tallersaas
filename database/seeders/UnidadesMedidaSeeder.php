<?php

namespace Database\Seeders;

use App\Models\UnidadMedida;
use Illuminate\Database\Seeder;

/**
 * Catálogo inicial de unidades de medida para talleres mecánicos.
 */
class UnidadesMedidaSeeder extends Seeder
{
    /**
     * @var list<array{codigo: string, nombre: string, orden: int}>
     */
    public const CATALOGO = [
        ['codigo' => 'UN', 'nombre' => 'Unidad', 'orden' => 10],
        ['codigo' => 'JGO', 'nombre' => 'Juego', 'orden' => 20],
        ['codigo' => 'PAR', 'nombre' => 'Par', 'orden' => 30],
        ['codigo' => 'L', 'nombre' => 'Litro', 'orden' => 40],
        ['codigo' => 'ML', 'nombre' => 'Mililitro', 'orden' => 50],
        ['codigo' => 'GAL', 'nombre' => 'Galón', 'orden' => 60],
        ['codigo' => 'KG', 'nombre' => 'Kilogramo', 'orden' => 70],
        ['codigo' => 'G', 'nombre' => 'Gramo', 'orden' => 80],
        ['codigo' => 'M', 'nombre' => 'Metro', 'orden' => 90],
        ['codigo' => 'CM', 'nombre' => 'Centímetro', 'orden' => 100],
        ['codigo' => 'CAJA', 'nombre' => 'Caja', 'orden' => 110],
        ['codigo' => 'ROLLO', 'nombre' => 'Rollo', 'orden' => 120],
        ['codigo' => 'BOLSA', 'nombre' => 'Bolsa', 'orden' => 130],
        ['codigo' => 'FRASCO', 'nombre' => 'Frasco', 'orden' => 140],
        ['codigo' => 'BOTE', 'nombre' => 'Bote', 'orden' => 150],
        ['codigo' => 'TUBO', 'nombre' => 'Tubo', 'orden' => 160],
        ['codigo' => 'PACK', 'nombre' => 'Pack', 'orden' => 170],
        ['codigo' => 'ENV', 'nombre' => 'Envase', 'orden' => 180],
    ];

    public function run(): void
    {
        foreach (self::CATALOGO as $row) {
            UnidadMedida::query()->updateOrCreate(
                ['codigo' => $row['codigo']],
                [
                    'nombre' => $row['nombre'],
                    'orden' => $row['orden'],
                    'activo' => true,
                    'deleted_at' => null,
                ],
            );
        }
    }
}
