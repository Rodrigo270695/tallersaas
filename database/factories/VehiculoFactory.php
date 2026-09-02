<?php

namespace Database\Factories;

use App\Models\Cliente;
use App\Models\Marca;
use App\Models\Modelo;
use App\Models\Vehiculo;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Vehiculo>
 */
class VehiculoFactory extends Factory
{
    protected $model = Vehiculo::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'cliente_id' => Cliente::factory(),
            'placa' => mb_strtoupper(fake()->unique()->bothify('???-###')),
            'marca_id' => Marca::factory(),
            'modelo_id' => null,
            'color' => fake()->safeColorName(),
            'anio' => fake()->numberBetween(2005, (int) date('Y')),
            'kilometraje' => fake()->numberBetween(0, 200000),
            'vin' => mb_strtoupper(fake()->unique()->bothify('#################')),
            'activo' => true,
        ];
    }

    public function inactivo(): static
    {
        return $this->state(['activo' => false]);
    }

    /**
     * Vehículo con marca y modelo ligados (modelo perteneciendo a la marca).
     */
    public function conMarcaYModelo(): static
    {
        return $this->state(function (): array {
            $marca = Marca::factory()->create();

            return [
                'marca_id' => $marca->id,
                'modelo_id' => Modelo::factory()->create(['marca_id' => $marca->id])->id,
            ];
        });
    }
}
