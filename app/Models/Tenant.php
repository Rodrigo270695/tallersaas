<?php

namespace App\Models;

use App\Models\Concerns\UsesPublicSchema;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use HasUuids, SoftDeletes, UsesPublicSchema;

    /**
     * Explícito: con `APP_LOCALE=es`, `laravel-lang/models` pluraliza
     * "tenant" al español ("tenantes") si dejamos que Eloquent lo adivine.
     */
    protected $table = 'tenants';

    protected $fillable = [
        'slug',
        'schema_name',
        'razon_social',
        'nombre_comercial',
        'ruc',
        'email_admin',
        'telefono',
        'direccion',
        'logo_url',
        'estado',
        'trial_ends_at',
        'suspended_at',
        'suspension_reason',
        'cancelled_at',
        'cancel_reason',
        'onboarding_completado',
        'onboarding_paso',
        'timezone',
        'locale',
        'canal_adquisicion',
        'referido_por_tenant_id',
    ];

    protected function casts(): array
    {
        return [
            'onboarding_completado' => 'boolean',
            'trial_ends_at' => 'datetime',
            'suspended_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function sedes(): HasMany
    {
        return $this->hasMany(Sede::class, 'tenant_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'tenant_id');
    }

    public function planOverrides(): HasMany
    {
        return $this->hasMany(TenantPlanOverride::class, 'tenant_id');
    }

    public function activeSubscription(): ?Subscription
    {
        return $this->subscriptions()
            ->whereIn('estado', ['trial', 'active', 'grace'])
            ->latest()
            ->first();
    }
}
