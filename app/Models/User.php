<?php

namespace App\Models;

use App\Models\Concerns\UsesPublicSchema;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property string $id
 * @property string|null $tenant_id
 * @property string $name
 * @property string $email
 * @property string|null $phone
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property bool $is_active
 * @property bool $must_change_password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'tenant_id',
    'name',
    'email',
    'phone',
    'password',
    'is_active',
    'must_change_password',
    'bootstrap_login_token',
    'bootstrap_login_expires_at',
    'last_login_at',
    'created_by_id',
])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token', 'bootstrap_login_token'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, HasUuids, Notifiable, PasskeyAuthenticatable, SoftDeletes, TwoFactorAuthenticatable, UsesPublicSchema;

    /**
     * Explícito: con `APP_LOCALE=es`, `laravel-lang/models` pluraliza
     * "user" al español ("useres") si dejamos que Eloquent lo adivine.
     */
    protected $table = 'users';

    private ?bool $isPlatformSuperadminMemo = null;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'bootstrap_login_expires_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    /**
     * Quién dio de alta a este usuario (autor del registro).
     *
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * Taller al que pertenece este usuario.
     *
     * Si es `null`, el usuario es del panel central (superadmin / staff
     * interno de TallerSaaS). Si tiene valor, es un empleado de ese taller.
     *
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * ¿Es un usuario del panel central (sin tenant asignado)?
     */
    public function isCentral(): bool
    {
        return $this->tenant_id === null;
    }

    /**
     * ¿Es superadmin de plataforma (rol global con tenant_id null)?
     *
     * Con Spatie Teams activo, `hasRole('superadmin')` falla en hosts de
     * taller porque el team actual es el UUID del tenant y el pivot del
     * superadmin queda en team null. Este helper consulta siempre con team null.
     */
    public function isPlatformSuperadmin(): bool
    {
        if ($this->isPlatformSuperadminMemo !== null) {
            return $this->isPlatformSuperadminMemo;
        }

        if (! $this->isCentral()) {
            return $this->isPlatformSuperadminMemo = false;
        }

        $previousTeam = getPermissionsTeamId();
        setPermissionsTeamId(null);

        try {
            $this->unsetRelation('roles');

            return $this->isPlatformSuperadminMemo = $this->hasRole('superadmin');
        } finally {
            setPermissionsTeamId($previousTeam);
            $this->unsetRelation('roles');
        }
    }

    /**
     * ¿Es un usuario operativo de un taller?
     */
    public function isTenantUser(): bool
    {
        return $this->tenant_id !== null;
    }

    /**
     * ¿Este usuario pertenece al tenant cuyo UUID se pasa?
     * `null` en el parámetro significa "panel central".
     */
    public function belongsToTenant(?string $tenantId): bool
    {
        return $this->tenant_id === $tenantId;
    }
}
