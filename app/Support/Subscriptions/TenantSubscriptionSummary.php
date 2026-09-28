<?php

namespace App\Support\Subscriptions;

use App\Models\Cliente;
use App\Models\FelDocument;
use App\Models\Producto;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Vehiculo;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * Resumen de la suscripción del taller, listo para el sidebar y para
 * Configuración → Mi suscripción. No incluye tokens ni datos internos.
 */
final class TenantSubscriptionSummary
{
    /**
     * @return array<string, mixed>|null
     */
    public static function chip(?Tenant $tenant): ?array
    {
        $summary = self::forTenant($tenant);

        if ($summary === null || ! is_array($summary['plan'] ?? null)) {
            return null;
        }

        return [
            'nombre' => $summary['plan']['nombre'],
            'codigo' => $summary['plan']['codigo'],
            'badge' => $summary['plan']['badge'],
            'color_hex' => $summary['plan']['color_hex'],
            'estado' => $summary['estado'],
            'ciclo' => $summary['ciclo'],
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function forTenant(?Tenant $tenant): ?array
    {
        if ($tenant === null) {
            return null;
        }

        $subscription = $tenant->subscriptions()
            ->with(['plan.features'])
            ->orderByDesc('created_at')
            ->first();

        if ($subscription === null) {
            return self::emptySummary($tenant);
        }

        $anchor = self::anchor($subscription, $tenant);
        $days = self::daysUntil($anchor);
        $plan = $subscription->plan;

        return [
            'has_subscription' => true,
            'plan' => $plan === null ? null : [
                'nombre' => $plan->nombre,
                'codigo' => $plan->codigo,
                'badge' => $plan->badge,
                'color_hex' => $plan->color_hex,
                'descripcion' => $plan->descripcion,
            ],
            'estado' => (string) $subscription->estado,
            'ciclo' => $subscription->ciclo,
            'precio_pactado' => $subscription->precio_pactado !== null
                ? (string) $subscription->precio_pactado
                : ($plan !== null ? (string) $plan->precio_mensual : null),
            'trial_ends_at' => self::iso($subscription->trial_ends_at ?? $tenant->trial_ends_at),
            'current_period_start' => self::iso($subscription->current_period_start),
            'current_period_end' => self::iso($subscription->current_period_end),
            'proximo_cobro_at' => self::iso($subscription->proximo_cobro_at),
            'grace_ends_at' => self::iso($subscription->grace_ends_at),
            'renewal_anchor_at' => self::iso($anchor),
            'days_until_renewal' => $days,
            'urgency' => self::urgency((string) $subscription->estado, $days),
            'renewal_url' => self::renewalUrl($tenant, $subscription),
            'usage' => self::usage($tenant, $subscription),
            'comprobantes' => self::comprobantes($subscription),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function emptySummary(Tenant $tenant): array
    {
        $trialEnd = self::toCarbon($tenant->trial_ends_at);
        $days = self::daysUntil($trialEnd);

        return [
            'has_subscription' => false,
            'plan' => null,
            'estado' => $tenant->estado === 'trial' ? 'trial' : 'unknown',
            'ciclo' => null,
            'precio_pactado' => null,
            'trial_ends_at' => self::iso($trialEnd),
            'current_period_start' => null,
            'current_period_end' => null,
            'proximo_cobro_at' => null,
            'grace_ends_at' => null,
            'renewal_anchor_at' => self::iso($trialEnd),
            'days_until_renewal' => $days,
            'urgency' => self::urgency('trial', $days),
            'renewal_url' => null,
            'usage' => [],
            'comprobantes' => ['enabled' => false, 'used' => 0, 'limit' => 0, 'period_label' => null],
        ];
    }

    private static function anchor(Subscription $subscription, Tenant $tenant): ?Carbon
    {
        return self::toCarbon(
            $subscription->proximo_cobro_at
                ?? $subscription->current_period_end
                ?? $subscription->trial_ends_at
                ?? $tenant->trial_ends_at,
        );
    }

    private static function daysUntil(?Carbon $anchor): ?int
    {
        if ($anchor === null) {
            return null;
        }

        return (int) now('America/Lima')->startOfDay()->diffInDays($anchor->copy()->timezone('America/Lima')->startOfDay(), false);
    }

    private static function urgency(string $estado, ?int $days): string
    {
        if (in_array($estado, ['suspended', 'cancelled'], true)) {
            return 'danger';
        }

        if ($days === null) {
            return 'muted';
        }

        if ($days < 0) {
            return 'red';
        }

        if ($days <= 3) {
            return 'amber';
        }

        if ($days <= 7) {
            return 'yellow';
        }

        return 'ok';
    }

    private static function renewalUrl(Tenant $tenant, Subscription $subscription): string
    {
        $template = rtrim((string) config('billing.renewal_url', 'https://orvae.pe'), '/');
        $query = array_filter([
            'tenant' => $tenant->slug,
            'plan' => $subscription->plan?->codigo,
            'ciclo' => $subscription->ciclo,
        ]);

        return $query === [] ? $template : $template.'?'.http_build_query($query);
    }

    /**
     * @return list<array{key: string, label: string, used: int, limit: int}>
     */
    private static function usage(Tenant $tenant, Subscription $subscription): array
    {
        $plan = $subscription->plan;
        $limit = function (string $feature) use ($plan): int {
            $value = $plan?->resolveFeature($feature);

            return is_int($value) ? $value : 0;
        };

        return [
            ['key' => 'clientes', 'label' => 'Clientes', 'used' => Cliente::query()->count(), 'limit' => $limit('max_clientes')],
            ['key' => 'vehiculos', 'label' => 'Vehículos', 'used' => Vehiculo::query()->count(), 'limit' => $limit('max_vehiculos')],
            ['key' => 'usuarios', 'label' => 'Usuarios', 'used' => User::query()->where('tenant_id', $tenant->id)->count(), 'limit' => $limit('max_usuarios')],
            ['key' => 'productos', 'label' => 'Productos', 'used' => Producto::query()->count(), 'limit' => $limit('max_productos')],
            ['key' => 'sedes', 'label' => 'Sedes', 'used' => $tenant->sedes()->count(), 'limit' => $limit('max_sedes')],
        ];
    }

    /**
     * @return array{enabled: bool, used: int, limit: int, period_label: string|null}
     */
    private static function comprobantes(Subscription $subscription): array
    {
        $limit = $subscription->plan?->resolveFeature('max_comprobantes_mes');
        $limit = is_int($limit) ? $limit : 0;
        $start = now('America/Lima')->startOfMonth();
        $end = now('America/Lima')->endOfMonth();
        $used = FelDocument::query()
            ->where('estado', FelDocument::ESTADO_EMITIDO)
            ->whereBetween('created_at', [$start, $end])
            ->count();

        return [
            'enabled' => $limit > 0,
            'used' => $used,
            'limit' => $limit,
            'period_label' => $start->locale('es')->isoFormat('D MMM YYYY').' – '.$end->locale('es')->isoFormat('D MMM YYYY'),
        ];
    }

    private static function toCarbon(mixed $value): ?Carbon
    {
        if ($value === null) {
            return null;
        }

        if ($value instanceof CarbonInterface) {
            return Carbon::instance($value);
        }

        return Carbon::parse($value);
    }

    private static function iso(mixed $value): ?string
    {
        return self::toCarbon($value)?->toIso8601String();
    }
}
