<?php

namespace Database\Factories;

use App\Models\Servicio;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Servicio>
 */
class ServicioFactory extends Factory
{
    protected $model = Servicio::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $nombre = fake()->unique()->words(3, true);

        return [
            'nombre' => ucfirst($nombre),
            'slug' => Str::slug($nombre).'-'.Str::lower(Str::random(4)),
            'precio' => 80.00,
            'duracion_minutos' => 60,
            'activo' => true,
        ];
    }
}
