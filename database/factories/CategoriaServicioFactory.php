<?php

namespace Database\Factories;

use App\Models\CategoriaServicio;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<CategoriaServicio>
 */
class CategoriaServicioFactory extends Factory
{
    protected $model = CategoriaServicio::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $nombre = fake()->unique()->words(2, true);

        return [
            'nombre' => ucfirst($nombre),
            'slug' => Str::slug($nombre).'-'.Str::lower(Str::random(4)),
            'activo' => true,
            'orden' => 10,
        ];
    }
}
