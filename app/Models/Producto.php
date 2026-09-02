<?php

namespace App\Models;

use Database\Factories\ProductoFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Producto extends Model
{
    /** @use HasFactory<ProductoFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    /** @var list<string> */
    public const UNIDADES = ['UN', 'L', 'KG', 'JGO', 'PAR', 'M'];

    protected $table = 'productos';

    protected $fillable = [
        'categoria_id',
        'nombre',
        'slug',
        'descripcion',
        'sku',
        'codigo_barras',
        'unidad',
        'precio_venta',
        'precio_compra',
        'stock_minimo',
        'activo',
        'created_by_id',
        'updated_by_id',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'precio_venta' => 'decimal:2',
            'precio_compra' => 'decimal:2',
            'stock_minimo' => 'decimal:3',
        ];
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(CategoriaProducto::class, 'categoria_id');
    }

    public function existenciasSede(): HasMany
    {
        return $this->hasMany(ExistenciaSede::class, 'producto_id');
    }

    public function movimientosInventario(): HasMany
    {
        return $this->hasMany(MovimientoInventario::class, 'producto_id');
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function actualizadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_id');
    }

    public static function uniqueSlugFrom(string $nombre, ?string $ignoreId = null): ?string
    {
        $base = Str::slug($nombre);
        if ($base === '') {
            return null;
        }

        $base = mb_substr($base, 0, 150);
        $slug = $base;
        $i = 0;

        while (
            self::query()
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->where('slug', $slug)
                ->exists()
        ) {
            $i++;
            $slug = mb_substr($base.'-'.$i, 0, 160);
        }

        return $slug;
    }
}
