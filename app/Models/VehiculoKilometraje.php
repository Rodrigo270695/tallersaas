<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehiculoKilometraje extends Model
{
    use HasUuids;

    public const ORIGEN_INGRESO = 'ingreso';

    public const ORIGEN_SALIDA = 'salida';

    public const ORIGEN_MANUAL = 'manual';

    protected $table = 'vehiculo_kilometrajes';

    protected $fillable = [
        'vehiculo_id',
        'orden_trabajo_id',
        'km',
        'origen',
        'recorded_at',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'km' => 'integer',
            'recorded_at' => 'datetime',
        ];
    }

    public function vehiculo(): BelongsTo
    {
        return $this->belongsTo(Vehiculo::class);
    }

    public function orden(): BelongsTo
    {
        return $this->belongsTo(OrdenTrabajo::class, 'orden_trabajo_id');
    }
}
