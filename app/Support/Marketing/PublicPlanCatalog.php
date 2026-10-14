<?php

declare(strict_types=1);

namespace App\Support\Marketing;

use App\Models\Plan;
use App\Models\PlanFeature;

/**
 * Planes públicos y activos con sus features resueltos (valor del plan o default del catálogo),
 * tal como los aplica el sistema. Lo consume la landing de Orvae.
 */
final class PublicPlanCatalog
{
    /**
     * @return array{plans: list<array<string, mixed>>, feature_catalog: array<string, array{type: string, group: string}>}
     */
    public static function payload(): array
    {
        $plans = Plan::query()
            ->where('es_publico', true)
            ->where('activo', true)
            ->with('features:id,plan_id,feature,valor_int,valor_bool,valor_str')
            ->orderBy('orden')
            ->orderBy('precio_mensual')
            ->get();

        return [
            'plans' => $plans->map(fn (Plan $plan): array => [
                'codigo' => $plan->codigo,
                'nombre' => $plan->nombre,
                'descripcion' => $plan->descripcion,
                'badge' => $plan->badge,
                'precio_mensual' => (float) $plan->precio_mensual,
                'precio_anual' => $plan->precio_anual !== null ? (float) $plan->precio_anual : null,
                'trial_days' => (int) $plan->trial_days,
                'orden' => (int) $plan->orden,
                'features' => self::resolveFeatures($plan),
            ])->values()->all(),
            'feature_catalog' => collect(Plan::FEATURE_CATALOG)
                ->map(fn (array $meta): array => ['type' => $meta['type'], 'group' => $meta['group']])
                ->all(),
        ];
    }

    /**
     * @return array<string, int|bool|string|null>
     */
    private static function resolveFeatures(Plan $plan): array
    {
        $rows = $plan->features->keyBy('feature');
        $resolved = [];

        foreach (Plan::FEATURE_CATALOG as $feature => $meta) {
            /** @var PlanFeature|null $row */
            $row = $rows->get($feature);

            $resolved[$feature] = $row === null
                ? $meta['default']
                : match ($meta['type']) {
                    'int' => $row->valor_int !== null ? (int) $row->valor_int : null,
                    'bool' => $row->valor_bool,
                    'str' => $row->valor_str,
                    default => null,
                };
        }

        return $resolved;
    }
}
