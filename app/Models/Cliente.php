<?php

namespace App\Models;

use Database\Factories\ClienteFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Cliente del taller (dueño de uno o más vehículos).
 *
 * Vive en el schema del tenant (aislado por `search_path`), por eso NO
 * usa `UsesPublicSchema` ni tiene columna `tenant_id`: el aislamiento lo
 * da PostgreSQL, no una condición WHERE.
 */
class Cliente extends Model
{
    /** @use HasFactory<ClienteFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    protected $table = 'clientes';

    public const TIPO_DNI = 'DNI';

    public const TIPO_RUC = 'RUC';

    public const TIPO_CE = 'CE';

    public const TIPO_PAS = 'PAS';

    public const TIPOS_DOCUMENTO = [
        self::TIPO_DNI,
        self::TIPO_RUC,
        self::TIPO_CE,
        self::TIPO_PAS,
    ];

    protected $fillable = [
        'nombres',
        'apellidos',
        'tipo_documento',
        'numero_documento',
        'telefono',
        'email',
        'direccion',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    /**
     * @return HasMany<Vehiculo, $this>
     */
    public function vehiculos(): HasMany
    {
        return $this->hasMany(Vehiculo::class);
    }

    public function nombreCompleto(): string
    {
        return trim("{$this->nombres} {$this->apellidos}");
    }

    /**
     * Cantidad exacta de dígitos que debe tener `numero_documento` para
     * este tipo de documento. `null` si el tipo no exige una longitud fija
     * (CE/PAS pueden incluir letras y longitudes variables).
     */
    public static function digitosRequeridos(string $tipoDocumento): ?int
    {
        return match (strtoupper(trim($tipoDocumento))) {
            self::TIPO_DNI => 8,
            self::TIPO_RUC => 11,
            default => null,
        };
    }
}
