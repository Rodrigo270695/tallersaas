<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PresupuestoItem extends Model
{
    use HasUuids;

    public const TIPO_SERVICIO = 'servicio';

    public const TIPO_PRODUCTO = 'producto';

    public const TIPO_OTRO = 'otro';

    protected $table = 'presupuesto_items';

    protected $fillable = [
        'presupuesto_id',
        'tipo',
        'servicio_id',
        'producto_id',
        'descripcion',
        'cantidad',
        'precio_unitario',
        'subtotal',
        'orden',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:3',
            'precio_unitario' => 'decimal:4',
            'subtotal' => 'decimal:2',
            'orden' => 'integer',
        ];
    }

    public function presupuesto(): BelongsTo
    {
        return $this->belongsTo(Presupuesto::class);
    }

    public function servicio(): BelongsTo
    {
        return $this->belongsTo(Servicio::class);
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }
}
