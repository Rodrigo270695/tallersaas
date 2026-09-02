<?php

namespace Database\Factories;

use App\Models\Sede;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Sede>
 */
class SedeFactory extends Factory
{
    protected $model = Sede::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => tenant_id() ?? fake()->uuid(),
            'nombre' => 'Sede '.fake()->city(),
            'codigo' => 'SEDE-'.fake()->unique()->numerify('###'),
            'direccion' => fake()->streetAddress(),
            'telefono' => fake()->numerify('9########'),
            'email' => fake()->unique()->safeEmail(),
            'distrito_id' => null,
            'distrito' => null,
            'provincia' => null,
            'departamento' => null,
            'activa' => true,
        ];
    }
}
