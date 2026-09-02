<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VentaPago extends Model
{
    use HasUuids;

    public const METODOS = ['efectivo', 'yape', 'plin', 'tarjeta', 'transferencia'];

    protected $table = 'venta_pagos';

    protected $fillable = [
        'venta_id',
        'metodo',
        'monto',
        'monto_recibido',
        'vuelto',
        'orden',
    ];

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
            'monto_recibido' => 'decimal:2',
            'vuelto' => 'decimal:2',
            'orden' => 'integer',
        ];
    }

    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class);
    }
}
