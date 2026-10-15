<?php

declare(strict_types=1);

namespace App\Support\Marketing;

/**
 * Conocimiento comercial de TallerSaaS para el Centro de Ventas de ORVAE (contrato v1).
 */
final class SalesKnowledgeExport
{
    public const PRODUCT = 'tallersaas';

    private const LIMIT_LABELS = [
        'max_sedes' => ['sede', 'sedes'],
        'max_usuarios' => ['usuario', 'usuarios'],
        'max_clientes' => ['cliente', 'clientes'],
        'max_vehiculos' => ['vehículo', 'vehículos'],
        'max_productos' => ['producto', 'productos'],
    ];

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $config = (array) config('salesbot_knowledge');

        return [
            'version' => 1,
            'producto' => self::PRODUCT,
            'nombre' => (string) ($config['nombre'] ?? 'TallerSaaS'),
            'resumen' => (string) ($config['resumen'] ?? ''),
            'publico' => (string) ($config['publico'] ?? ''),
            'palabras_clave' => array_values((array) ($config['palabras_clave'] ?? [])),
            'planes' => $this->planes(),
            'secciones' => [
                ...$this->secciones('novedad', $config['novedades'] ?? []),
                ...$this->secciones('modulo', $config['modulos'] ?? []),
                ...$this->secciones('faq', $config['faq'] ?? []),
                ...$this->secciones('objecion', $config['objeciones'] ?? []),
            ],
            'demo' => $config['demo'] ?? null,
            'registro_url' => $config['registro_url'] ?? null,
            'actualizado_at' => null,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function planes(): array
    {
        return array_map(fn (array $plan): array => [
            'codigo' => $plan['codigo'],
            'nombre' => $plan['nombre'],
            'descripcion' => $plan['descripcion'],
            'precio_mensual' => $plan['precio_mensual'],
            'precio_anual' => $plan['precio_anual'],
            'moneda' => 'PEN',
            'trial_days' => $plan['trial_days'],
            'incluye' => $this->incluye($plan['features']),
        ], PublicPlanCatalog::payload()['plans']);
    }

    /**
     * @param  array<string, int|bool|string|null>  $features
     * @return list<string>
     */
    private function incluye(array $features): array
    {
        $items = ['Todos los módulos incluidos'];

        foreach (self::LIMIT_LABELS as $feature => [$singular, $plural]) {
            $value = $features[$feature] ?? null;

            $items[] = match (true) {
                ! is_int($value) || $value < 0 => "Sin límite de {$plural}",
                $value === 1 => "1 {$singular}",
                default => "{$value} {$plural}",
            };
        }

        $comprobantes = array_values(array_filter([
            ($features['boletas_electronicas'] ?? false) === true ? 'boletas' : null,
            ($features['facturas_electronicas'] ?? false) === true ? 'facturas' : null,
            ($features['guias_remision'] ?? false) === true ? 'guías de remisión' : null,
        ]));

        if ($comprobantes === []) {
            $items[] = 'Sin comprobantes SUNAT';

            return $items;
        }

        $max = $features['max_comprobantes_mes'] ?? null;
        $items[] = 'Facturación electrónica SUNAT: '.implode(', ', $comprobantes)
            .(is_int($max) && $max >= 0 ? " (hasta {$max} comprobantes/mes)" : ' (comprobantes ilimitados)');

        return $items;
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return list<array<string, mixed>>
     */
    private function secciones(string $tipo, array $items): array
    {
        return array_values(array_map(fn (array $item): array => [
            'tipo' => $tipo,
            'titulo' => (string) ($item['titulo'] ?? ''),
            'contenido' => (string) ($item['contenido'] ?? ''),
            'fecha' => $item['fecha'] ?? null,
        ], $items));
    }
}
