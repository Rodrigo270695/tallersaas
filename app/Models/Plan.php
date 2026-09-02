<?php

namespace App\Models;

use App\Models\Concerns\UsesPublicSchema;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use HasUuids, UsesPublicSchema;

    /**
     * Explícito: con `APP_LOCALE=es`, `laravel-lang/models` pluraliza
     * "plan" al español ("planes") si dejamos que Eloquent lo adivine.
     */
    protected $table = 'plans';

    /** Código del plan gratuito (no genera cobros en Plataforma → Cobros). */
    public const CODIGO_FREE = 'free';

    /**
     * Catálogo central de **features conocidos** que se pueden vincular
     * a un plan vía `plan_features`. Mantener sincronizado con cualquier
     * feature que el código consuma vía `Plan::resolveFeature()`.
     */
    public const FEATURE_CATALOG = [
        'max_sedes' => ['type' => 'int', 'group' => 'limites', 'default' => 1],
        'max_usuarios' => ['type' => 'int', 'group' => 'limites', 'default' => 3],
        'max_clientes' => ['type' => 'int', 'group' => 'limites', 'default' => 500],
        'max_vehiculos' => ['type' => 'int', 'group' => 'limites', 'default' => 500],
        'max_productos' => ['type' => 'int', 'group' => 'limites', 'default' => 200],

        'boletas_electronicas' => ['type' => 'bool', 'group' => 'facturacion', 'default' => false],
        'facturas_electronicas' => ['type' => 'bool', 'group' => 'facturacion', 'default' => false],
        'guias_remision' => ['type' => 'bool', 'group' => 'facturacion', 'default' => false],
        'max_comprobantes_mes' => ['type' => 'int', 'group' => 'facturacion', 'default' => 50],
    ];

    protected $fillable = [
        'codigo',
        'nombre',
        'descripcion',
        'badge',
        'color_hex',
        'precio_mensual',
        'precio_anual',
        'trial_days',
        'orden',
        'es_publico',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'precio_mensual' => 'decimal:2',
            'precio_anual' => 'decimal:2',
            'es_publico' => 'boolean',
            'activo' => 'boolean',
        ];
    }

    public function features(): HasMany
    {
        return $this->hasMany(PlanFeature::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function isFree(): bool
    {
        return $this->codigo === self::CODIGO_FREE;
    }

    /**
     * @param  Builder<Plan>  $query
     * @return Builder<Plan>
     */
    public function scopeExcludingFree(Builder $query): Builder
    {
        return $query->where('codigo', '!=', self::CODIGO_FREE);
    }

    public function resolveFeature(string $feature): int|bool|string|null
    {
        $meta = self::FEATURE_CATALOG[$feature] ?? null;
        if (! $meta) {
            return null;
        }

        /** @var PlanFeature|null $row */
        $row = $this->features()->where('feature', $feature)->first();
        if (! $row) {
            return $meta['default'];
        }

        return match ($meta['type']) {
            'int' => $row->valor_int !== null ? (int) $row->valor_int : null,
            'bool' => $row->valor_bool,
            'str' => $row->valor_str,
            default => null,
        };
    }
}
