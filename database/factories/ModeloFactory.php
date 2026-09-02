<?php

namespace Database\Factories;

use App\Models\Marca;
use App\Models\Modelo;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Modelo>
 */
class ModeloFactory extends Factory
{
    protected $model = Modelo::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'marca_id' => Marca::factory(),
            'nombre' => fake()->unique()->word(),
        ];
    }
}
