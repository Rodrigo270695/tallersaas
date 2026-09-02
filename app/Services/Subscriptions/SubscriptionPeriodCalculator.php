<?php

namespace App\Services\Subscriptions;

use App\Models\Subscription;
use App\Support\Subscriptions\SubscriptionCiclo;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * Calcula el próximo período de una suscripción al renovarse.
 */
class SubscriptionPeriodCalculator
{
    public function nextPeriodStart(Subscription $subscription, CarbonInterface $paidAt): CarbonInterface
    {
        $currentEnd = $subscription->current_period_end;

        if ($currentEnd instanceof CarbonInterface && $currentEnd->isFuture()) {
            return Carbon::parse($currentEnd);
        }

        return Carbon::parse($paidAt);
    }

    public function nextPeriodEnd(CarbonInterface $start, string $ciclo): CarbonInterface
    {
        return Carbon::parse($start)->addMonthsNoOverflow(SubscriptionCiclo::months($ciclo));
    }
}
