<?php

namespace App\Models;

use App\Models\Concerns\UsesPublicSchema;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Unidad de medida del catálogo global (public.unidades_medida).
 *
 * Los productos guardan el `codigo` (no el UUID) en `productos.unidad`.
 */
class UnidadMedida extends Model
{
    use HasUuids;
    use SoftDeletes;
    use UsesPublicSchema;

    protected $table = 'unidades_medida';

    protected $fillable = [
        'codigo',
        'nombre',
        'orden',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'orden' => 'integer',
            'activo' => 'boolean',
        ];
    }

    /**
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeActivas(Builder $query): Builder
    {
        return $query->where('activo', true);
    }

    /**
     * Opciones para formularios de inventario (solo activas).
     *
     * @return list<array{codigo: string, nombre: string}>
     */
    public static function opcionesParaFormulario(): array
    {
        $rows = self::query()
            ->activas()
            ->orderBy('orden')
            ->orderBy('codigo')
            ->get(['codigo', 'nombre'])
            ->map(fn (self $u): array => [
                'codigo' => $u->codigo,
                'nombre' => $u->nombre,
            ])
            ->all();

        if ($rows !== []) {
            return $rows;
        }

        // Fallback si aún no se sembró el catálogo.
        return array_map(
            static fn (string $codigo): array => [
                'codigo' => $codigo,
                'nombre' => $codigo,
            ],
            Producto::UNIDADES,
        );
    }

    /**
     * @return list<string>
     */
    public static function codigosActivos(): array
    {
        return self::query()
            ->activas()
            ->orderBy('orden')
            ->pluck('codigo')
            ->map(fn (mixed $c): string => (string) $c)
            ->all();
    }
}
