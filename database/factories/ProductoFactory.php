<?php

namespace Database\Factories;

use App\Models\Producto;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Producto>
 */
class ProductoFactory extends Factory
{
    protected $model = Producto::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $nombre = fake()->unique()->words(3, true);

        return [
            'nombre' => ucfirst($nombre),
            'slug' => Str::slug($nombre).'-'.Str::lower(Str::random(4)),
            'sku' => strtoupper(Str::random(8)),
            'unidad' => 'UN',
            'precio_venta' => 25.50,
            'precio_compra' => 12.00,
            'stock_minimo' => 2,
            'activo' => true,
        ];
    }
}
