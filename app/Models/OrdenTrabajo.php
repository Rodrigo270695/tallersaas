<?php

namespace App\Models;

use Database\Factories\OrdenTrabajoFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Orden de trabajo del taller (schema del tenant).
 */
class OrdenTrabajo extends Model
{
    /** @use HasFactory<OrdenTrabajoFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    public const ESTADO_ABIERTA = 'abierta';

    public const ESTADO_EN_PROCESO = 'en_proceso';

    public const ESTADO_LISTA = 'lista';

    public const ESTADO_ENTREGADA = 'entregada';

    public const ESTADO_ANULADA = 'anulada';

    /** @var list<string> */
    public const ESTADOS = [
        self::ESTADO_ABIERTA,
        self::ESTADO_EN_PROCESO,
        self::ESTADO_LISTA,
        self::ESTADO_ENTREGADA,
        self::ESTADO_ANULADA,
    ];

    protected $table = 'ordenes_trabajo';

    protected $fillable = [
        'sede_id',
        'numero',
        'cliente_id',
        'vehiculo_id',
        'cita_id',
        'presupuesto_id',
        'estado',
        'ingreso_at',
        'prometida_at',
        'lista_at',
        'entregada_at',
        'km_ingreso',
        'km_salida',
        'solicitud_cliente',
        'diagnostico',
        'notas_internas',
        'subtotal',
        'descuento_total',
        'igv_total',
        'total',
        'pagado_total',
        'saldo',
        'lista_notificada_at',
        'anulada_at',
        'anulado_motivo',
        'created_by_id',
        'closed_by_id',
    ];

    protected function casts(): array
    {
        return [
            'ingreso_at' => 'datetime',
            'prometida_at' => 'datetime',
            'lista_at' => 'datetime',
            'entregada_at' => 'datetime',
            'lista_notificada_at' => 'datetime',
            'anulada_at' => 'datetime',
            'km_ingreso' => 'integer',
            'km_salida' => 'integer',
            'subtotal' => 'decimal:2',
            'descuento_total' => 'decimal:2',
            'igv_total' => 'decimal:2',
            'total' => 'decimal:2',
            'pagado_total' => 'decimal:2',
            'saldo' => 'decimal:2',
        ];
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    public function vehiculo(): BelongsTo
    {
        return $this->belongsTo(Vehiculo::class);
    }

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class);
    }

    public function cita(): BelongsTo
    {
        return $this->belongsTo(Cita::class);
    }

    public function presupuesto(): BelongsTo
    {
        return $this->belongsTo(Presupuesto::class);
    }

    public function presupuestos(): HasMany
    {
        return $this->hasMany(Presupuesto::class, 'orden_trabajo_id');
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function lineas(): HasMany
    {
        return $this->hasMany(OrdenTrabajoLinea::class, 'orden_trabajo_id')->orderBy('orden');
    }

    public function ventas(): HasMany
    {
        return $this->hasMany(Venta::class, 'orden_trabajo_id');
    }

    public static function generateNextNumber(): string
    {
        $year = now()->year;
        $prefix = "OT-{$year}-";

        $max = self::withTrashed()
            ->where('numero', 'like', $prefix.'%')
            ->pluck('numero')
            ->map(fn ($numero) => (int) substr((string) $numero, strlen($prefix)))
            ->max() ?? 0;

        return $prefix.str_pad((string) ($max + 1), 5, '0', STR_PAD_LEFT);
    }
}
