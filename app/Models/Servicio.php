<?php

namespace App\Models;

use Database\Factories\ServicioFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Servicio extends Model
{
    /** @use HasFactory<ServicioFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    protected $table = 'servicios';

    protected $fillable = [
        'categoria_id',
        'nombre',
        'slug',
        'descripcion',
        'precio',
        'duracion_minutos',
        'activo',
        'created_by_id',
        'updated_by_id',
    ];

    protected function casts(): array
    {
        return [
            'precio' => 'decimal:2',
            'duracion_minutos' => 'integer',
            'activo' => 'boolean',
        ];
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(CategoriaServicio::class, 'categoria_id');
    }

    public function lineasOrden(): HasMany
    {
        return $this->hasMany(OrdenTrabajoLinea::class, 'servicio_id');
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
