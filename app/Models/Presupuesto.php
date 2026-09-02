<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Presupuesto extends Model
{
    use HasUuids;
    use SoftDeletes;

    public const ESTADO_BORRADOR = 'borrador';

    public const ESTADO_ENVIADO = 'enviado';

    public const ESTADO_APROBADO = 'aprobado';

    public const ESTADO_RECHAZADO = 'rechazado';

    public const ESTADO_VENCIDO = 'vencido';

    public const ESTADO_CONVERTIDO = 'convertido';

    /** @var list<string> */
    public const ESTADOS = [
        self::ESTADO_BORRADOR,
        self::ESTADO_ENVIADO,
        self::ESTADO_APROBADO,
        self::ESTADO_RECHAZADO,
        self::ESTADO_VENCIDO,
        self::ESTADO_CONVERTIDO,
    ];

    /** @var list<string> */
    public const ESTADOS_EDITABLES = [
        self::ESTADO_BORRADOR,
        self::ESTADO_ENVIADO,
    ];

    protected $table = 'presupuestos';

    protected $fillable = [
        'sede_id',
        'numero',
        'cliente_id',
        'vehiculo_id',
        'orden_trabajo_id',
        'estado',
        'diagnostico',
        'notas_internas',
        'subtotal',
        'descuento_total',
        'igv_total',
        'total',
        'valido_hasta',
        'public_token',
        'enviado_at',
        'aprobado_at',
        'rechazado_at',
        'rechazo_motivo',
        'convertido_at',
        'created_by_id',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'descuento_total' => 'decimal:2',
            'igv_total' => 'decimal:2',
            'total' => 'decimal:2',
            'valido_hasta' => 'date',
            'enviado_at' => 'datetime',
            'aprobado_at' => 'datetime',
            'rechazado_at' => 'datetime',
            'convertido_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Presupuesto $presupuesto): void {
            if ($presupuesto->public_token === null || $presupuesto->public_token === '') {
                $presupuesto->public_token = (string) Str::uuid();
            }
        });
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

    public function ordenTrabajo(): BelongsTo
    {
        return $this->belongsTo(OrdenTrabajo::class, 'orden_trabajo_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PresupuestoItem::class)->orderBy('orden');
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function puedeEditarse(): bool
    {
        return in_array($this->estado, self::ESTADOS_EDITABLES, true);
    }

    public function puedeEnviarse(): bool
    {
        return in_array($this->estado, [self::ESTADO_BORRADOR, self::ESTADO_ENVIADO], true)
            && (float) $this->total > 0;
    }

    public function puedeAprobarse(): bool
    {
        return $this->estado === self::ESTADO_ENVIADO && ! $this->estaVencido();
    }

    public function puedeAplicarseAOrden(): bool
    {
        return $this->estado === self::ESTADO_APROBADO
            && $this->orden_trabajo_id !== null
            && $this->convertido_at === null;
    }

    public function estaVencido(): bool
    {
        if ($this->valido_hasta === null) {
            return false;
        }

        return $this->valido_hasta->copy()->endOfDay()->isPast()
            && ! in_array($this->estado, [self::ESTADO_APROBADO, self::ESTADO_RECHAZADO, self::ESTADO_CONVERTIDO], true);
    }

    public function sincronizarVencimiento(): void
    {
        if ($this->estaVencido() && $this->estado === self::ESTADO_ENVIADO) {
            $this->forceFill(['estado' => self::ESTADO_VENCIDO])->save();
        }
    }

    public static function generateNextNumber(): string
    {
        $year = now()->year;
        $prefix = "PRE-{$year}-";

        $max = self::withTrashed()
            ->where('numero', 'like', $prefix.'%')
            ->pluck('numero')
            ->map(fn ($numero) => (int) substr((string) $numero, strlen($prefix)))
            ->max() ?? 0;

        return $prefix.str_pad((string) ($max + 1), 5, '0', STR_PAD_LEFT);
    }

    public function publicUrl(): string
    {
        return url('/p/'.$this->public_token);
    }
}
