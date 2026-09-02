<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

/**
 * Catálogo inicial de planes TallerSaaS: free, básico, pro.
 * Idempotente vía `updateOrCreate` por `codigo`.
 */
class PlansAndFeaturesSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'codigo' => 'free',
                'nombre' => 'Gratis',
                'descripcion' => 'Para talleres pequeños que recién comienzan a digitalizarse.',
                'precio_mensual' => 0,
                'precio_anual' => 0,
                'trial_days' => 0,
                'orden' => 1,
                'es_publico' => true,
                'activo' => true,
                'features' => [
                    'max_sedes' => 1,
                    'max_usuarios' => 2,
                    'max_clientes' => 100,
                    'max_vehiculos' => 100,
                    'max_productos' => 50,
                    'boletas_electronicas' => false,
                    'facturas_electronicas' => false,
                    'guias_remision' => false,
                    'max_comprobantes_mes' => 0,
                ],
            ],
            [
                'codigo' => 'basico',
                'nombre' => 'Básico',
                'descripcion' => 'Para talleres con una sede que necesitan facturación electrónica.',
                'precio_mensual' => 59.90,
                'precio_anual' => 599.00,
                'trial_days' => 14,
                'orden' => 2,
                'es_publico' => true,
                'activo' => true,
                'features' => [
                    'max_sedes' => 1,
                    'max_usuarios' => 5,
                    'max_clientes' => 1000,
                    'max_vehiculos' => 1000,
                    'max_productos' => 500,
                    'boletas_electronicas' => true,
                    'facturas_electronicas' => false,
                    'guias_remision' => false,
                    'max_comprobantes_mes' => 200,
                ],
            ],
            [
                'codigo' => 'pro',
                'nombre' => 'Pro',
                'descripcion' => 'Para talleres con múltiples sedes y alto volumen de comprobantes.',
                'precio_mensual' => 129.90,
                'precio_anual' => 1299.00,
                'trial_days' => 14,
                'orden' => 3,
                'es_publico' => true,
                'activo' => true,
                'features' => [
                    'max_sedes' => 5,
                    'max_usuarios' => 20,
                    'max_clientes' => 10000,
                    'max_vehiculos' => 10000,
                    'max_productos' => 5000,
                    'boletas_electronicas' => true,
                    'facturas_electronicas' => true,
                    'guias_remision' => true,
                    'max_comprobantes_mes' => 2000,
                ],
            ],
        ];

        foreach ($plans as $definition) {
            $features = $definition['features'];
            unset($definition['features']);

            $plan = Plan::query()->updateOrCreate(
                ['codigo' => $definition['codigo']],
                $definition,
            );

            foreach ($features as $feature => $value) {
                $meta = Plan::FEATURE_CATALOG[$feature] ?? null;
                if ($meta === null) {
                    continue;
                }

                $plan->features()->updateOrCreate(
                    ['feature' => $feature],
                    match ($meta['type']) {
                        'int' => ['valor_int' => $value, 'valor_bool' => null, 'valor_str' => null],
                        'bool' => ['valor_int' => null, 'valor_bool' => $value, 'valor_str' => null],
                        default => ['valor_int' => null, 'valor_bool' => null, 'valor_str' => (string) $value],
                    },
                );
            }
        }

        $this->command?->info('Planes sembrados: '.implode(', ', array_column($plans, 'codigo')));
    }
}
