<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrdenTrabajoMecanico extends Model
{
    use HasUuids;

    public const ROL_RESPONSABLE = 'responsable';

    public const ROL_APOYO = 'apoyo';

    protected $table = 'orden_trabajo_mecanicos';

    protected $fillable = [
        'orden_trabajo_id',
        'user_id',
        'rol',
    ];

    public function orden(): BelongsTo
    {
        return $this->belongsTo(OrdenTrabajo::class, 'orden_trabajo_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
