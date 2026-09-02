<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Configuración general del taller (única fila por tenant).
 *
 * Vive en `cfg_taller_settings` dentro del schema del tenant activo.
 * La migración garantiza que solo puede existir UNA fila por schema vía
 * el índice único `CREATE UNIQUE INDEX … ON ((TRUE))`. Por eso este
 * modelo se opera como singleton mediante {@see self::current()}.
 *
 * Alcance: datos fiscales/comerciales del taller y su branding (logo,
 * colores) usados tanto en el panel como en la pantalla de login del
 * subdominio del tenant.
 *
 * Requisitos:
 *   - La request DEBE entrar por un subdominio de tenant para que
 *     `ResolveTenant` haya aplicado el `search_path`. En el host
 *     central la tabla no existe en `public`.
 *
 * @property string $id
 * @property ?string $ruc
 * @property ?string $razon_social
 * @property ?string $nombre_comercial
 * @property ?string $direccion_fiscal
 * @property ?int $distrito_id
 * @property ?string $logo_path
 * @property-read ?string $logo_url
 * @property ?string $email_institucional
 * @property ?string $telefono_principal
 * @property ?string $web_url
 * @property array<string, mixed> $horario_atencion
 * @property string $moneda
 * @property string $igv_porcentaje
 * @property bool $precio_incluye_igv
 * @property ?string $color_primario
 * @property ?string $color_secundario
 * @property ?string $updated_by_id
 * @property-read ?User $actualizadoPor
 */
class TallerSetting extends Model
{
    use HasUuids;

    protected $table = 'cfg_taller_settings';

    protected $fillable = [
        'ruc',
        'razon_social',
        'nombre_comercial',
        'direccion_fiscal',
        'distrito_id',
        'logo_path',
        'email_institucional',
        'telefono_principal',
        'web_url',
        'horario_atencion',
        'moneda',
        'igv_porcentaje',
        'precio_incluye_igv',
        'color_primario',
        'color_secundario',
        'updated_by_id',
        'notificar_cita_whatsapp_activo',
        'recordatorio_48h_activo',
        'recordatorio_2h_activo',
        'emite_comprobantes_sunat',
        'apisunat_token_enc',
        'apisunat_mode',
        'apisunat_configurado',
    ];

    /**
     * Atributos virtuales (no son columnas, se derivan): la URL pública
     * del logo se calcula desde `logo_path` y se incluye en el JSON para
     * que el frontend pueda mostrar la imagen sin lógica extra.
     */
    protected $appends = ['logo_url'];

    protected function casts(): array
    {
        return [
            'horario_atencion' => 'array',
            'precio_incluye_igv' => 'boolean',
            'notificar_cita_whatsapp_activo' => 'boolean',
            'recordatorio_48h_activo' => 'boolean',
            'recordatorio_2h_activo' => 'boolean',
            'emite_comprobantes_sunat' => 'boolean',
            'apisunat_configurado' => 'boolean',
            'igv_porcentaje' => 'decimal:2',
            'distrito_id' => 'integer',
        ];
    }

    public function distritoModel(): BelongsTo
    {
        return $this->belongsTo(Distrito::class, 'distrito_id');
    }

    /**
     * URL pública del logo derivada de `logo_path`. Devuelve `null` si
     * todavía no se subió. Requiere haber ejecutado
     * `php artisan storage:link` para servirse desde `/storage/...`.
     */
    protected function logoUrl(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->logo_path
                ? asset('storage/'.ltrim($this->logo_path, '/'))
                : null,
        );
    }

    public function actualizadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_id');
    }

    /**
     * Devuelve la (única) fila de configuración del tenant activo,
     * creándola con valores por defecto si todavía no existe.
     *
     * Patrón singleton-por-schema: usa `firstOrCreate([])` porque el
     * índice único sobre `((TRUE))` garantiza a nivel BD que solo
     * puede existir UNA fila por schema.
     */
    public static function current(): self
    {
        return static::query()->firstOrCreate([]);
    }
}
