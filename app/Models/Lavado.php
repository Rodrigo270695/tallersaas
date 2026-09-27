<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Lavado extends Model
{
    use HasUuids;
    use SoftDeletes;

    public const ESTADO_ABIERTO = 'abierto';

    public const ESTADO_COBRADO = 'cobrado';

    public const ESTADO_ANULADO = 'anulado';

    protected $table = 'lavados';

    protected $fillable = [
        'numero',
        'sede_id',
        'cliente_id',
        'vehiculo_id',
        'placa',
        'estado',
        'notas',
        'created_by_id',
    ];

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class);
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    public function vehiculo(): BelongsTo
    {
        return $this->belongsTo(Vehiculo::class);
    }

    public function lineas(): HasMany
    {
        return $this->hasMany(LavadoLinea::class, 'lavado_id')->orderBy('orden');
    }

    public function venta(): HasOne
    {
        return $this->hasOne(Venta::class, 'lavado_id');
    }

    public static function generateNextNumber(): string
    {
        $year = now()->year;
        $prefix = "CW-{$year}-";

        $max = self::withTrashed()
            ->where('numero', 'like', $prefix.'%')
            ->pluck('numero')
            ->map(fn ($numero) => (int) substr((string) $numero, strlen($prefix)))
            ->max() ?? 0;

        return $prefix.str_pad((string) ($max + 1), 5, '0', STR_PAD_LEFT);
    }
}
