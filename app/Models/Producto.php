<?php

namespace App\Models;

use Database\Factories\ProductoFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
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

    /** @deprecated Usar {@see UnidadMedida::codigosActivos()} — se mantiene por compatibilidad de factories/tests. */
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
        'foto_path',
        'activo',
        'created_by_id',
        'updated_by_id',
    ];

    /**
     * @var list<string>
     */
    protected $appends = [
        'foto_url',
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

    /**
     * URL pública de la foto (via symlink `public/storage`).
     */
    protected function fotoUrl(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->foto_path
                ? asset('storage/'.ltrim($this->foto_path, '/'))
                : null,
        );
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
