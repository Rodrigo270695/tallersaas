<?php

namespace Database\Factories;

use App\Models\CategoriaProducto;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<CategoriaProducto>
 */
class CategoriaProductoFactory extends Factory
{
    protected $model = CategoriaProducto::class;

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
