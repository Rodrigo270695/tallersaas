<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LavadoLinea extends Model
{
    use HasUuids;

    protected $table = 'lavado_lineas';

    protected $fillable = [
        'lavado_id',
        'servicio_id',
        'descripcion',
        'cantidad',
        'precio_unitario',
        'orden',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:3',
            'precio_unitario' => 'decimal:4',
        ];
    }

    public function lavado(): BelongsTo
    {
        return $this->belongsTo(Lavado::class, 'lavado_id');
    }

    public function servicio(): BelongsTo
    {
        return $this->belongsTo(Servicio::class);
    }
}
