<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Venta extends Model
{
    use HasUuids;
    use SoftDeletes;

    public const ESTADO_PENDIENTE = 'pendiente';

    public const ESTADO_PAGADO = 'pagado';

    public const ESTADO_PARCIAL = 'parcial';

    public const ESTADO_ANULADO = 'anulado';

    public const METODOS = ['efectivo', 'yape', 'plin', 'tarjeta', 'transferencia', 'mixto'];

    public const FEL_PENDIENTE = 'pendiente';

    public const FEL_EMITIDO = 'emitido';

    public const FEL_RECHAZADO = 'rechazado';

    protected $table = 'ventas';

    protected $fillable = [
        'numero',
        'sede_id',
        'caja_sesion_id',
        'cliente_id',
        'vehiculo_id',
        'orden_trabajo_id',
        'moneda',
        'estado',
        'subtotal',
        'igv_monto',
        'descuento_monto',
        'total',
        'metodo_pago',
        'monto_recibido',
        'vuelto',
        'fecha_pago',
        'notas',
        'anulado_at',
        'anulado_por_id',
        'motivo_anulacion',
        'created_by_id',
        'fel_document_id',
        'fel_estado',
        'tipo_comprobante_sunat',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'igv_monto' => 'decimal:2',
            'descuento_monto' => 'decimal:2',
            'total' => 'decimal:2',
            'monto_recibido' => 'decimal:2',
            'vuelto' => 'decimal:2',
            'fecha_pago' => 'datetime',
            'anulado_at' => 'datetime',
            'tipo_comprobante_sunat' => 'integer',
        ];
    }

    public function sesion(): BelongsTo
    {
        return $this->belongsTo(CajaSesion::class, 'caja_sesion_id');
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    public function vehiculo(): BelongsTo
    {
        return $this->belongsTo(Vehiculo::class);
    }

    public function ordenTrabajo(): BelongsTo
    {
        return $this->belongsTo(OrdenTrabajo::class, 'orden_trabajo_id');
    }

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    public function lineas(): HasMany
    {
        return $this->hasMany(VentaLinea::class);
    }

    public function pagos(): HasMany
    {
        return $this->hasMany(VentaPago::class);
    }

    public function felDocument(): BelongsTo
    {
        return $this->belongsTo(FelDocument::class, 'fel_document_id');
    }

    public static function generateNextNumber(): string
    {
        $year = now()->year;
        $prefix = "VTA-{$year}-";

        $max = self::withTrashed()
            ->where('numero', 'like', $prefix.'%')
            ->lockForUpdate()
            ->pluck('numero')
            ->map(fn ($numero) => (int) substr((string) $numero, strlen($prefix)))
            ->max() ?? 0;

        return $prefix.str_pad((string) ($max + 1), 5, '0', STR_PAD_LEFT);
    }
}
