<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrdenTrabajoLinea extends Model
{
    use HasUuids;

    public const TIPO_SERVICIO = 'servicio';

    public const TIPO_PRODUCTO = 'producto';

    public const TIPO_OTRO = 'otro';

    /** @var list<string> */
    public const TIPOS = [
        self::TIPO_SERVICIO,
        self::TIPO_PRODUCTO,
        self::TIPO_OTRO,
    ];

    protected $table = 'orden_trabajo_lineas';

    protected $fillable = [
        'orden_trabajo_id',
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

    public function ordenTrabajo(): BelongsTo
    {
        return $this->belongsTo(OrdenTrabajo::class, 'orden_trabajo_id');
    }

    public function servicio(): BelongsTo
    {
        return $this->belongsTo(Servicio::class, 'servicio_id');
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
