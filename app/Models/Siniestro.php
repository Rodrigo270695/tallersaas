<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Siniestro extends Model
{
    use HasUuids;
    use SoftDeletes;

    public const ESTADO_ABIERTO = 'abierto';

    public const ESTADO_APROBADO = 'aprobado';

    public const ESTADO_RECHAZADO = 'rechazado';

    public const ESTADO_CERRADO = 'cerrado';

    /** @var list<string> */
    public const ESTADOS = [
        self::ESTADO_ABIERTO,
        self::ESTADO_APROBADO,
        self::ESTADO_RECHAZADO,
        self::ESTADO_CERRADO,
    ];

    protected $table = 'siniestros';

    protected $fillable = [
        'orden_trabajo_id',
        'aseguradora_id',
        'numero',
        'estado',
        'cobertura_pct',
        'monto_reclamado',
        'monto_seguro',
        'monto_cliente',
        'notas',
        'created_by_id',
    ];

    protected function casts(): array
    {
        return [
            'cobertura_pct' => 'decimal:2',
            'monto_reclamado' => 'decimal:2',
            'monto_seguro' => 'decimal:2',
            'monto_cliente' => 'decimal:2',
        ];
    }

    public function ordenTrabajo(): BelongsTo
    {
        return $this->belongsTo(OrdenTrabajo::class, 'orden_trabajo_id');
    }

    public function aseguradora(): BelongsTo
    {
        return $this->belongsTo(Aseguradora::class);
    }
}
