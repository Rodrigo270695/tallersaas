<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubscriptionUpdateRequest;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Tenancy\TenantManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = [
        'estado',
        'ciclo',
        'precio_pactado',
        'trial_ends_at',
        'current_period_end',
        'proximo_cobro_at',
        'created_at',
    ];

    private const ESTADO_OPTIONS = ['todos', 'trial', 'active', 'grace', 'suspended', 'cancelled'];

    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search', ''));
        $perPageRequested = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPageRequested, self::PER_PAGE_OPTIONS, true)
            ? $perPageRequested
            : 10;

        $sort = (string) $request->string('sort', '');
        $direction = strtolower((string) $request->string('direction', 'desc'));
        $sortValid = in_array($sort, self::SORTABLE_COLUMNS, true);
        $directionValid = in_array($direction, ['asc', 'desc'], true);

        $estado = (string) $request->string('estado', 'todos');
        if (! in_array($estado, self::ESTADO_OPTIONS, true)) {
            $estado = 'todos';
        }

        $planId = trim((string) $request->string('plan_id', ''));

        $query = $this->buildBaseQuery($search, $estado, $planId);

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            $query->orderByDesc('created_at');
        } else {
            $query->orderByDesc('created_at');
        }

        $subscriptions = $query
            ->with([
                'tenant:id,slug,razon_social,nombre_comercial,email_admin',
                'plan:id,codigo,nombre,badge,color_hex',
            ])
            ->paginate($perPage)
            ->withQueryString();

        $plansCatalog = Plan::query()
            ->orderBy('orden')
            ->get(['id', 'codigo', 'nombre', 'badge', 'color_hex', 'precio_mensual', 'precio_anual', 'trial_days']);

        $statsByEstado = Subscription::query()
            ->selectRaw('estado, COUNT(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado')
            ->all();

        $mrr = (float) Subscription::query()
            ->whereIn('estado', ['active', 'grace'])
            ->when($planId !== '', fn ($q) => $q->where('plan_id', $planId))
            ->sum('precio_pactado');

        return Inertia::render('plataforma/suscripciones/index', [
            'subscriptions' => $subscriptions,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estado,
                'plan_id' => $planId,
            ],
            'stats' => [
                'total' => Subscription::query()->count(),
                'trial' => (int) ($statsByEstado['trial'] ?? 0),
                'active' => (int) ($statsByEstado['active'] ?? 0),
                'grace' => (int) ($statsByEstado['grace'] ?? 0),
                'suspended' => (int) ($statsByEstado['suspended'] ?? 0),
                'cancelled' => (int) ($statsByEstado['cancelled'] ?? 0),
                'coincidencias' => $subscriptions->total(),
                'mrr' => number_format($mrr, 2, '.', ''),
            ],
            'plans_catalog' => $plansCatalog,
        ]);
    }

    public function update(
        SubscriptionUpdateRequest $request,
        Subscription $subscription,
        TenantManager $tenants,
    ): RedirectResponse {
        $data = $request->validated();
        $estado = (string) $data['estado'];
        $trialEnds = $this->parseDateTime($data['trial_ends_at'] ?? null);
        $periodStart = $this->parseDateTime($data['current_period_start'] ?? null);
        $periodEnd = $this->parseDateTime($data['current_period_end'] ?? null);
        $nextCharge = $this->parseDateTime($data['proximo_cobro_at'] ?? null) ?? $periodEnd;
        $graceEnds = $this->parseDateTime($data['grace_ends_at'] ?? null);
        $cancelled = $estado === Subscription::STATUS_CANCELLED;

        $subscription->update([
            'plan_id' => $data['plan_id'],
            'estado' => $estado,
            'ciclo' => $data['ciclo'],
            'precio_pactado' => $data['precio_pactado'],
            'descuento_pct' => $data['descuento_pct'] ?? 0,
            'trial_ends_at' => $trialEnds,
            'current_period_start' => $periodStart,
            'current_period_end' => $periodEnd,
            'proximo_cobro_at' => $nextCharge,
            'grace_ends_at' => $graceEnds,
            'cancel_reason' => $cancelled ? ($data['cancel_reason'] ?? null) : null,
            'cancel_feedback' => $cancelled ? ($data['cancel_feedback'] ?? null) : null,
            'cancelled_at' => $cancelled ? ($subscription->cancelled_at ?? now()) : null,
        ]);

        $tenant = Tenant::query()->whereKey($subscription->tenant_id)->first();
        if ($tenant !== null) {
            $tenantEstado = match ($estado) {
                Subscription::STATUS_ACTIVE, Subscription::STATUS_GRACE => 'active',
                Subscription::STATUS_PAST_DUE => 'suspended',
                Subscription::STATUS_CANCELLED => 'cancelled',
                default => 'trial',
            };

            $tenant->update([
                'estado' => $tenantEstado,
                'trial_ends_at' => $trialEnds,
                'suspended_at' => $tenantEstado === 'suspended' ? ($tenant->suspended_at ?? now()) : null,
                'suspension_reason' => $tenantEstado === 'suspended' ? ($tenant->suspension_reason ?: 'Ajuste manual de suscripción') : null,
                'cancelled_at' => $tenantEstado === 'cancelled' ? ($tenant->cancelled_at ?? now()) : null,
            ]);

            $tenants->flushCacheFor($tenant);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Suscripción actualizada correctamente.']);

        return back();
    }

    private function parseDateTime(mixed $value): ?Carbon
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        return Carbon::parse($value, 'America/Lima');
    }

    /**
     * @return Builder<Subscription>
     */
    private function buildBaseQuery(string $search, string $estado, string $planId): Builder
    {
        $query = Subscription::query();

        if ($search !== '') {
            $query->whereHas('tenant', function (Builder $q) use ($search): void {
                $q->where('slug', 'ILIKE', "%{$search}%")
                    ->orWhere('razon_social', 'ILIKE', "%{$search}%")
                    ->orWhere('nombre_comercial', 'ILIKE', "%{$search}%")
                    ->orWhere('email_admin', 'ILIKE', "%{$search}%");
            });
        }

        if ($estado !== 'todos') {
            $query->where('estado', $estado);
        }

        if ($planId !== '') {
            $query->where('plan_id', $planId);
        }

        return $query;
    }
}
