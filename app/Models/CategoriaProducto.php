<?php

namespace App\Models;

use Database\Factories\CategoriaProductoFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CategoriaProducto extends Model
{
    /** @use HasFactory<CategoriaProductoFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    protected $table = 'categorias_productos';

    protected $fillable = [
        'nombre',
        'slug',
        'descripcion',
        'orden',
        'activo',
        'created_by_id',
        'updated_by_id',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'orden' => 'integer',
        ];
    }

    public function productos(): HasMany
    {
        return $this->hasMany(Producto::class, 'categoria_id');
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function actualizadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_id');
    }

    public static function generateNextOrden(): int
    {
        return ((int) (self::query()->max('orden') ?? 0)) + 10;
    }

    public static function uniqueSlugFrom(string $nombre, ?string $ignoreId = null): ?string
    {
        $base = Str::slug($nombre);
        if ($base === '') {
            return null;
        }

        $base = mb_substr($base, 0, 130);
        $slug = $base;
        $i = 0;

        while (
            self::query()
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->where('slug', $slug)
                ->exists()
        ) {
            $i++;
            $slug = mb_substr($base.'-'.$i, 0, 140);
        }

        return $slug;
    }
}
