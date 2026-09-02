<?php

namespace Database\Factories;

use App\Models\Cliente;
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
            'marca' => fake()->randomElement(['Toyota', 'Hyundai', 'Kia', 'Nissan', 'Chevrolet']),
            'modelo' => fake()->word(),
            'color' => fake()->safeColorName(),
            'anio' => fake()->numberBetween(2005, (int) date('Y')),
            'kilometraje' => fake()->numberBetween(0, 200000),
            'vin' => mb_strtoupper(fake()->unique()->bothify('#################')),
        ];
    }
}
