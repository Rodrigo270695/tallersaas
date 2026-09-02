<?php

namespace Database\Factories;

use App\Models\Cita;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Cita>
 */
class CitaFactory extends Factory
{
    protected $model = Cita::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'inicia_at' => now()->addDay()->setTime(10, 0),
            'duracion_minutos' => 60,
            'estado' => Cita::ESTADO_PROGRAMADA,
            'motivo' => 'Mantenimiento',
        ];
    }
}
