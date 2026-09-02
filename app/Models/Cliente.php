<?php

namespace App\Models;

use Database\Factories\ClienteFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Cliente del taller (dueño de uno o más vehículos).
 *
 * Vive en el schema del tenant (aislado por `search_path`), por eso NO
 * usa `UsesPublicSchema` ni tiene columna `tenant_id`: el aislamiento lo
 * da PostgreSQL, no una condición WHERE.
 */
class Cliente extends Model
{
    /** @use HasFactory<ClienteFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    protected $table = 'clientes';

    protected $fillable = [
        'nombres',
        'apellidos',
        'tipo_documento',
        'numero_documento',
        'telefono',
        'email',
        'direccion',
    ];

    /**
     * @return HasMany<Vehiculo, $this>
     */
    public function vehiculos(): HasMany
    {
        return $this->hasMany(Vehiculo::class);
    }

    public function nombreCompleto(): string
    {
        return trim("{$this->nombres} {$this->apellidos}");
    }
}
