<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrdenTrabajoFoto extends Model
{
    use HasUuids;

    protected $table = 'orden_trabajo_fotos';

    protected $fillable = [
        'orden_trabajo_id',
        'path',
        'nota',
        'created_by_id',
    ];

    /**
     * @var list<string>
     */
    protected $appends = [
        'url',
    ];

    protected function url(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->path
                ? asset('storage/'.ltrim($this->path, '/'))
                : null,
        );
    }

    public function orden(): BelongsTo
    {
        return $this->belongsTo(OrdenTrabajo::class, 'orden_trabajo_id');
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}
