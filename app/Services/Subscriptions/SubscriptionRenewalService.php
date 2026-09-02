<?php

namespace App\Services\Subscriptions;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\Tenant;
use App\Support\Subscriptions\BillingGrace;
use App\Support\Subscriptions\SubscriptionCiclo;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use InvalidArgumentException;

/**
 * Renueva el período de una suscripción existente (mismo tenant/subdominio).
 * Llamado desde Orvae PE tras confirmar un pago de renovación.
 */
class SubscriptionRenewalService
{
    public function __construct(
        private readonly SubscriptionPeriodCalculator $periods,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function renew(Tenant $tenant, array $payload): Subscription
    {
        $subscription = $tenant->activeSubscription()
            ?? $tenant->subscriptions()->latest()->first();

        if ($subscription === null) {
            throw new InvalidArgumentException('El tenant no tiene suscripción para renovar.');
        }

        if ((string) $subscription->tenant_id !== (string) $tenant->id) {
            throw new InvalidArgumentException('La suscripción no pertenece al tenant indicado.');
        }

        $planSlug = (string) ($payload['plan_slug'] ?? '');
        $plan = Plan::query()
            ->where('codigo', $planSlug)
            ->where('activo', true)
            ->first();

        if ($plan === null) {
            throw new InvalidArgumentException("Plan no encontrado o inactivo: {$planSlug}");
        }

        $cicloCandidate = (string) ($payload['ciclo'] ?? $subscription->ciclo ?? SubscriptionCiclo::MENSUAL);
        $ciclo = SubscriptionCiclo::normalize($cicloCandidate);

        $payment = is_array($payload['payment'] ?? null) ? $payload['payment'] : null;
        $paidAt = $this->parseDate($payment['pagado_at'] ?? null) ?? now();
        $periodStart = $this->parseDate($payload['period_start'] ?? null)
            ?? $this->periods->nextPeriodStart($subscription, $paidAt);
        $periodEnd = $this->parseDate($payload['period_end'] ?? null)
            ?? $this->periods->nextPeriodEnd($periodStart, $ciclo);

        $precio = isset($payload['precio_pactado'])
            ? (float) $payload['precio_pactado']
            : SubscriptionCiclo::suggestedPriceFromPlan(
                (float) $plan->precio_mensual,
                $plan->precio_anual !== null ? (float) $plan->precio_anual : null,
                $ciclo,
            );

        $subscription->update([
            'plan_id' => $plan->id,
            'estado' => 'active',
            'ciclo' => $ciclo,
            'trial_ends_at' => null,
            'grace_ends_at' => BillingGrace::endsAtFrom($periodEnd),
            'current_period_start' => $periodStart,
            'current_period_end' => $periodEnd,
            'proximo_cobro_at' => $periodEnd,
            'precio_pactado' => $precio,
        ]);

        if ($payment !== null) {
            $this->recordPayment($subscription, $tenant, $plan, $payment, $periodStart, $periodEnd);
        }

        // Si el tenant estaba bloqueado por vencimiento, reactivarlo tras el pago.
        if ($tenant->estado !== 'active') {
            $tenant->update(['estado' => 'active']);
        }

        return $subscription->fresh(['plan']);
    }

    /**
     * @param  array<string, mixed>  $payment
     */
    private function recordPayment(
        Subscription $subscription,
        Tenant $tenant,
        Plan $plan,
        array $payment,
        CarbonInterface $periodStart,
        CarbonInterface $periodEnd,
    ): void {
        $transactionId = $payment['transaction_id'] ?? null;

        if (is_string($transactionId) && $transactionId !== '') {
            $exists = SubscriptionPayment::query()
                ->where('subscription_id', $subscription->id)
                ->where('pasarela_transaction_id', $transactionId)
                ->exists();

            if ($exists) {
                return;
            }
        }

        SubscriptionPayment::create([
            'subscription_id' => $subscription->id,
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'monto' => $payment['monto'],
            'moneda' => $payment['moneda'] ?? 'PEN',
            'igv_monto' => $payment['igv_monto'] ?? 0,
            'descuento_monto' => $payment['descuento_monto'] ?? 0,
            'total' => $payment['total'] ?? $payment['monto'],
            'estado' => $payment['estado'] ?? 'procesado',
            'pasarela' => $payment['pasarela'] ?? 'orvae',
            'pasarela_transaction_id' => $transactionId,
            'pasarela_response' => $payment['raw_response'] ?? null,
            'periodo_inicio' => $periodStart,
            'periodo_fin' => $periodEnd,
            'pagado_at' => isset($payment['pagado_at']) ? Carbon::parse($payment['pagado_at']) : now(),
            'created_at' => now(),
        ]);
    }

    private function parseDate(mixed $value): ?CarbonInterface
    {
        if ($value === null || $value === '') {
            return null;
        }

        return Carbon::parse($value);
    }
}
