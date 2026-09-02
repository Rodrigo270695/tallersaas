<?php

namespace App\Models;

use Database\Factories\MarcaFactory;
use Database\Seeders\VehiculoMarcaModeloSeeder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Marca de vehículo (Toyota, Hyundai, Honda…).
 *
 * Vive en el schema del tenant: el catálogo base se siembra igual en
 * todos los talleres (ver {@see VehiculoMarcaModeloSeeder}),
 * pero cada taller puede crear las suyas y solo él las verá.
 */
class Marca extends Model
{
    /** @use HasFactory<MarcaFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    protected $table = 'marcas';

    protected $fillable = [
        'nombre',
    ];

    /**
     * El nombre de marca siempre se guarda en MAYÚSCULAS, sin importar
     * cómo lo escriba el usuario.
     */
    protected function setNombreAttribute(string $value): void
    {
        $this->attributes['nombre'] = mb_strtoupper(trim($value));
    }

    /**
     * @return HasMany<Modelo, $this>
     */
    public function modelos(): HasMany
    {
        return $this->hasMany(Modelo::class);
    }
}
