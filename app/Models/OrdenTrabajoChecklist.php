<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrdenTrabajoChecklist extends Model
{
    use HasUuids;

    public const ESTADO_OK = 'ok';

    public const ESTADO_OBSERVACION = 'observacion';

    public const ESTADO_NA = 'na';

    protected $table = 'orden_trabajo_checklist';

    protected $fillable = [
        'orden_trabajo_id',
        'clave',
        'estado',
        'nota',
        'updated_by_id',
    ];

    public function orden(): BelongsTo
    {
        return $this->belongsTo(OrdenTrabajo::class, 'orden_trabajo_id');
    }
}
