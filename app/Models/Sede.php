<?php

namespace App\Models;

use App\Models\Concerns\UsesPublicSchema;
use Database\Factories\SedeFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sede extends Model
{
    /** @use HasFactory<SedeFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;
    use UsesPublicSchema;

    protected $table = 'sedes';

    protected $fillable = [
        'tenant_id',
        'nombre',
        'codigo',
        'direccion',
        'telefono',
        'email',
        'distrito_id',
        'distrito',
        'provincia',
        'departamento',
        'serie_factura',
        'serie_boleta',
        'activa',
    ];

    protected function casts(): array
    {
        return [
            'distrito_id' => 'integer',
            'activa' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function distritoModel(): BelongsTo
    {
        return $this->belongsTo(Distrito::class, 'distrito_id');
    }

    public static function generateNextCode(string $tenantId): string
    {
        $maxNumber = self::withTrashed()
            ->where('tenant_id', $tenantId)
            ->pluck('codigo')
            ->map(fn ($c) => (int) preg_replace('/\D/', '', (string) $c))
            ->max() ?? 0;

        return 'SEDE-'.str_pad((string) ($maxNumber + 1), 3, '0', STR_PAD_LEFT);
    }
}
