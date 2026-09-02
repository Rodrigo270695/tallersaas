<?php

namespace Database\Factories;

use App\Models\Cliente;
use App\Models\OrdenTrabajo;
use App\Models\Vehiculo;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrdenTrabajo>
 */
class OrdenTrabajoFactory extends Factory
{
    protected $model = OrdenTrabajo::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'numero' => 'OT-'.now()->year.'-'.fake()->unique()->numerify('#####'),
            'cliente_id' => Cliente::factory(),
            'vehiculo_id' => Vehiculo::factory(),
            'estado' => OrdenTrabajo::ESTADO_ABIERTA,
            'ingreso_at' => now(),
            'solicitud_cliente' => fake()->sentence(),
            'subtotal' => 0,
            'descuento_total' => 0,
            'igv_total' => 0,
            'total' => 0,
            'pagado_total' => 0,
            'saldo' => 0,
        ];
    }
}
