<?php

namespace App\Models;

use Database\Factories\VehiculoFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Vehículo perteneciente a un {@see Cliente} del taller.
 *
 * Vive en el schema del tenant (aislado por `search_path`).
 */
class Vehiculo extends Model
{
    /** @use HasFactory<VehiculoFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    protected $table = 'vehiculos';

    protected $fillable = [
        'cliente_id',
        'placa',
        'marca',
        'modelo',
        'color',
        'anio',
        'kilometraje',
        'vin',
    ];

    /**
     * @return BelongsTo<Cliente, $this>
     */
    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }
}
