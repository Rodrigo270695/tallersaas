<?php

namespace App\Models;

use Database\Factories\ModeloFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modelo de vehículo (Hilux, Tucson, Civic…), en cascada bajo una {@see Marca}.
 *
 * Igual que `Marca`, vive en el schema del tenant y sigue la misma regla
 * de catálogo base + datos propios por taller.
 */
class Modelo extends Model
{
    /** @use HasFactory<ModeloFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    protected $table = 'modelos';

    protected $fillable = [
        'marca_id',
        'nombre',
    ];

    /**
     * El nombre de modelo siempre se guarda en MAYÚSCULAS, sin importar
     * cómo lo escriba el usuario.
     */
    protected function setNombreAttribute(string $value): void
    {
        $this->attributes['nombre'] = mb_strtoupper(trim($value));
    }

    /**
     * @return BelongsTo<Marca, $this>
     */
    public function marca(): BelongsTo
    {
        return $this->belongsTo(Marca::class);
    }
}
