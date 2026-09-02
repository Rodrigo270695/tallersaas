<?php

namespace App\Models;

use App\Models\Concerns\UsesPublicSchema;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Spatie\Permission\Models\Role as SpatieRole;

/**
 * Rol de la aplicación (extensión del modelo nativo de Spatie).
 *
 * Mantenemos todo el comportamiento de Spatie (asignación de permisos,
 * caché interno, sincronización con `model_has_roles`) y solo agregamos:
 *
 *   - Columna `description` (UI/UX): explicación humana del propósito del rol.
 *   - Roles protegidos: no se pueden renombrar ni eliminar desde el panel.
 *
 * @property int $id
 * @property string $name
 * @property string $guard_name
 * @property ?string $description
 * @property-read bool $is_system
 */
class Role extends SpatieRole
{
    use UsesPublicSchema;

    /**
     * Solo panel central. Ocultos en el UI de taller (no asignables allí).
     *
     * @var list<string>
     */
    public const PLATFORM_ROLES = ['superadmin'];

    /**
     * Roles operativos compartidos por todos los talleres.
     * No eliminables / no renombrables (sí se pueden ajustar permisos).
     *
     * @var list<string>
     */
    public const BASE_TALLER_ROLES = [
        'admin_taller',
        'mecanico',
        'recepcionista',
        'almacenero',
    ];

    /**
     * @var list<string>
     */
    public const SYSTEM_ROLES = [
        'superadmin',
        'admin_taller',
        'mecanico',
        'recepcionista',
        'almacenero',
    ];

    protected $fillable = [
        'name',
        'guard_name',
        'description',
        'tenant_id',
    ];

    /**
     * @var list<string>
     */
    protected $appends = [
        'is_system',
    ];

    /**
     * @return list<string>
     */
    public static function protectedRoleNames(): array
    {
        return self::SYSTEM_ROLES;
    }

    /**
     * @return list<string>
     */
    public static function platformOnlyRoleNames(): array
    {
        return self::PLATFORM_ROLES;
    }

    public function isBaseTallerRole(): bool
    {
        return in_array($this->name, self::BASE_TALLER_ROLES, true);
    }

    public function isPlatformRole(): bool
    {
        return in_array($this->name, self::PLATFORM_ROLES, true);
    }

    protected function isSystem(): Attribute
    {
        return Attribute::make(
            get: fn () => in_array($this->name, self::protectedRoleNames(), true),
        );
    }

    /**
     * Scope para filtrar por tipo desde el listado:
     *   - 'todos'         → sin filtro
     *   - 'sistema'       → roles reservados
     *   - 'personalizado' → roles creados por el cliente
     */
    public function scopeOfType(Builder $query, string $type): Builder
    {
        if ($type === 'sistema') {
            return $query->whereIn('name', self::protectedRoleNames());
        }

        if ($type === 'personalizado') {
            return $query->whereNotIn('name', self::protectedRoleNames());
        }

        return $query;
    }
}
