<?php

namespace App\Models;

use Database\Factories\CitaFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Cita extends Model
{
    /** @use HasFactory<CitaFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    public const ESTADO_PROGRAMADA = 'programada';

    public const ESTADO_CONFIRMADA = 'confirmada';

    public const ESTADO_EN_RECEPCION = 'en_recepcion';

    public const ESTADO_CONVERTIDA = 'convertida';

    public const ESTADO_NO_ASISTIO = 'no_asistio';

    public const ESTADO_CANCELADA = 'cancelada';

    /** @var list<string> */
    public const ESTADOS = [
        self::ESTADO_PROGRAMADA,
        self::ESTADO_CONFIRMADA,
        self::ESTADO_EN_RECEPCION,
        self::ESTADO_CONVERTIDA,
        self::ESTADO_NO_ASISTIO,
        self::ESTADO_CANCELADA,
    ];

    /** @var list<string> */
    public const ESTADOS_ACTIVAS = [
        self::ESTADO_PROGRAMADA,
        self::ESTADO_CONFIRMADA,
        self::ESTADO_EN_RECEPCION,
    ];

    /** @var list<string> */
    public const ESTADOS_EDITABLES = [
        self::ESTADO_PROGRAMADA,
        self::ESTADO_CONFIRMADA,
        self::ESTADO_EN_RECEPCION,
        self::ESTADO_NO_ASISTIO,
        self::ESTADO_CANCELADA,
    ];

    protected $table = 'citas';

    protected $fillable = [
        'sede_id',
        'cliente_id',
        'vehiculo_id',
        'assigned_user_id',
        'inicia_at',
        'duracion_minutos',
        'estado',
        'motivo',
        'notas',
        'orden_trabajo_id',
        'reminder_sent_at',
        'created_by_id',
        'updated_by_id',
    ];

    protected function casts(): array
    {
        return [
            'inicia_at' => 'datetime',
            'duracion_minutos' => 'integer',
            'reminder_sent_at' => 'datetime',
        ];
    }

    public function puedeConvertirse(): bool
    {
        return in_array($this->estado, self::ESTADOS_ACTIVAS, true)
            && $this->orden_trabajo_id === null;
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

    public function asignadoA(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function ordenTrabajo(): BelongsTo
    {
        return $this->belongsTo(OrdenTrabajo::class, 'orden_trabajo_id');
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function actualizadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_id');
    }
}
