<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FelSerie extends Model
{
    use HasUuids;

    public const TIPO_TICKET = 0;

    public const TIPO_FACTURA = 1;

    public const TIPO_BOLETA = 2;

    protected $table = 'fel_series';

    protected $fillable = [
        'sede_id',
        'tipo_comprobante',
        'serie',
        'ultimo_correlativo',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'tipo_comprobante' => 'integer',
            'ultimo_correlativo' => 'integer',
            'activo' => 'boolean',
        ];
    }

    /**
     * @return list<int>
     */
    public static function tiposSunat(): array
    {
        return [self::TIPO_FACTURA, self::TIPO_BOLETA];
    }

    public static function esTipoSunat(?int $tipo): bool
    {
        return $tipo !== null && in_array($tipo, self::tiposSunat(), true);
    }

    public static function labelTipo(int $tipo): string
    {
        return match ($tipo) {
            self::TIPO_FACTURA => 'Factura',
            self::TIPO_BOLETA => 'Boleta de venta',
            default => 'Ticket',
        };
    }

    public static function serieSugerida(int $tipo): string
    {
        return match ($tipo) {
            self::TIPO_FACTURA => 'F001',
            self::TIPO_BOLETA => 'B001',
            default => 'T001',
        };
    }

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class);
    }

    public function documentos(): HasMany
    {
        return $this->hasMany(FelDocument::class, 'fel_serie_id');
    }
}
