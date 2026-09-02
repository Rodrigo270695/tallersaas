<?php

namespace App\Models;

use App\Models\Concerns\UsesPublicSchema;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    use HasUuids, UsesPublicSchema;

    /**
     * Explícito: con `APP_LOCALE=es`, `laravel-lang/models` pluraliza mal
     * "subscription" ("subscriptiones") si dejamos que Eloquent lo adivine.
     */
    protected $table = 'subscriptions';

    public const STATUS_TRIALING = 'trial';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_GRACE = 'grace';

    public const STATUS_PAST_DUE = 'suspended';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'tenant_id',
        'plan_id',
        'estado',
        'ciclo',
        'trial_ends_at',
        'current_period_start',
        'current_period_end',
        'grace_ends_at',
        'cancelled_at',
        'cancel_reason',
        'cancel_feedback',
        'precio_pactado',
        'descuento_pct',
        'proximo_cobro_at',
        'metodo_pago_token',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'trial_ends_at' => 'datetime',
            'current_period_start' => 'datetime',
            'current_period_end' => 'datetime',
            'grace_ends_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'proximo_cobro_at' => 'datetime',
            'precio_pactado' => 'decimal:2',
            'descuento_pct' => 'decimal:2',
            'metadata' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SubscriptionPayment::class);
    }

    /**
     * @param  Builder<Subscription>  $query
     * @return Builder<Subscription>
     */
    public function scopeBillable(Builder $query): Builder
    {
        return $query
            ->whereIn('estado', ['trial', 'active', 'grace', 'suspended'])
            ->whereHas('plan', fn (Builder $planQuery) => $planQuery->excludingFree());
    }
}
