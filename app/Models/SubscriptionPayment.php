<?php

namespace App\Models;

use App\Models\Concerns\UsesPublicSchema;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pago de una suscripción al SaaS.
 *
 * La fila base la genera Orvae cuando la pasarela (Niubiz/Culqi/MP)
 * confirma el cobro vía webhook. **TallerSaaS no procesa pagos**; solo
 * los lee y los opera para soporte (reembolso manual, nota interna).
 */
class SubscriptionPayment extends Model
{
    use HasUuids, UsesPublicSchema;

    /**
     * Explícito: con `APP_LOCALE=es`, `laravel-lang/models` pluraliza mal
     * "subscription_payment" si dejamos que Eloquent lo adivine.
     */
    protected $table = 'subscription_payments';

    public $timestamps = false;

    protected $fillable = [
        'subscription_id',
        'tenant_id',
        'plan_id',
        'monto',
        'moneda',
        'igv_monto',
        'descuento_monto',
        'total',
        'estado',
        'pasarela',
        'pasarela_transaction_id',
        'pasarela_response',
        'periodo_inicio',
        'periodo_fin',
        'internal_note',
        'refunded_at',
        'refunded_by',
        'refund_reason',
        'invoice_resent_at',
        'pagado_at',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
            'igv_monto' => 'decimal:2',
            'descuento_monto' => 'decimal:2',
            'total' => 'decimal:2',
            'pasarela_response' => 'array',
            'periodo_inicio' => 'datetime',
            'periodo_fin' => 'datetime',
            'pagado_at' => 'datetime',
            'created_at' => 'datetime',
            'refunded_at' => 'datetime',
            'invoice_resent_at' => 'datetime',
        ];
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function refundedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'refunded_by');
    }
}
