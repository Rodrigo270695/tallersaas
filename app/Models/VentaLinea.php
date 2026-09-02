<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VentaLinea extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $table = 'venta_lineas';

    protected $fillable = [
        'venta_id',
        'producto_id',
        'servicio_id',
        'tipo_linea',
        'descripcion',
        'cantidad',
        'precio_unitario',
        'descuento_importe',
        'subtotal',
        'orden',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:3',
            'precio_unitario' => 'decimal:4',
            'descuento_importe' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'orden' => 'integer',
        ];
    }

    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class);
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    public function servicio(): BelongsTo
    {
        return $this->belongsTo(Servicio::class);
    }
}
