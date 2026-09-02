<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Subscription;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
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
            ->get(['id', 'codigo', 'nombre', 'badge', 'color_hex']);

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
