<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Compra extends Model
{
    use HasUuids;
    use SoftDeletes;

    public const TIPO_BOLETA = 'boleta';

    public const TIPO_FACTURA = 'factura';

    /** @var list<string> */
    public const TIPOS_COMPROBANTE = [self::TIPO_BOLETA, self::TIPO_FACTURA];

    protected $table = 'compras';

    protected $fillable = [
        'proveedor_id',
        'sede_id',
        'tipo_comprobante',
        'serie',
        'numero_documento',
        'fecha_documento',
        'moneda',
        'total',
        'notas',
        'factura_path',
        'factura_original_name',
        'created_by_id',
        'updated_by_id',
    ];

    /** @var list<string> */
    protected $appends = [
        'factura_url',
    ];

    protected function casts(): array
    {
        return [
            'fecha_documento' => 'date',
            'total' => 'decimal:2',
        ];
    }

    protected function facturaUrl(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->factura_path
                ? asset('storage/'.ltrim((string) $this->factura_path, '/'))
                : null,
        );
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id');
    }

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    public function lineas(): HasMany
    {
        return $this->hasMany(CompraLinea::class, 'compra_id')->orderBy('orden');
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(MovimientoInventario::class, 'compra_id');
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
