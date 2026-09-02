<?php

namespace App\Http\Controllers;

use App\Http\Requests\TenantStoreRequest;
use App\Http\Requests\TenantUpdateRequest;
use App\Models\Plan;
use App\Models\Tenant;
use App\Services\Tenancy\TenantProvisioner;
use App\Tenancy\TenantManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use RuntimeException;

class TenantController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = [
        'slug',
        'razon_social',
        'estado',
        'trial_ends_at',
        'created_at',
    ];

    private const ESTADO_OPTIONS = ['todos', 'trial', 'active', 'suspended', 'cancelled'];

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

        $query = $this->buildBaseQuery($search, $estado);

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            $query->orderByDesc('created_at');
        } else {
            $query->orderByDesc('created_at');
        }

        $tenants = $query
            ->with([
                'subscriptions' => fn ($q) => $q
                    ->whereIn('estado', ['trial', 'active', 'grace', 'suspended'])
                    ->latest()
                    ->limit(1),
                'subscriptions.plan:id,codigo,nombre,badge,color_hex',
            ])
            ->paginate($perPage)
            ->withQueryString();

        $plansCatalog = Plan::query()
            ->where('activo', true)
            ->orderBy('orden')
            ->get(['id', 'codigo', 'nombre', 'trial_days', 'precio_mensual', 'color_hex']);

        $statsByEstado = Tenant::query()
            ->selectRaw('estado, COUNT(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado')
            ->all();

        return Inertia::render('plataforma/tenants/index', [
            'tenants' => $tenants,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estado,
            ],
            'stats' => [
                'total' => Tenant::query()->count(),
                'trial' => (int) ($statsByEstado['trial'] ?? 0),
                'active' => (int) ($statsByEstado['active'] ?? 0),
                'suspended' => (int) ($statsByEstado['suspended'] ?? 0),
                'cancelled' => (int) ($statsByEstado['cancelled'] ?? 0),
                'coincidencias' => $tenants->total(),
            ],
            'plans_catalog' => $plansCatalog,
        ]);
    }

    public function store(TenantStoreRequest $request, TenantProvisioner $provisioner): RedirectResponse
    {
        $data = $request->validated();

        try {
            $provisioner->provision([
                'plan_slug' => $data['plan_slug'],
                'tenant_slug' => $data['tenant_slug'],
                'razon_social' => $data['razon_social'],
                'nombre_comercial' => $data['nombre_comercial'] ?? null,
                'ruc' => $data['ruc'] ?? null,
                'admin_email' => $data['admin_email'],
                'admin_password' => $data['admin_password'],
                'admin_nombres' => $data['admin_nombres'] ?? 'Administrador',
                'admin_apellidos' => $data['admin_apellidos'] ?? 'Taller',
                'telefono' => $data['telefono'] ?? null,
                'ciclo' => $data['ciclo'] ?? 'mensual',
                'canal_adquisicion' => 'plataforma',
            ]);
        } catch (InvalidArgumentException|RuntimeException $e) {
            throw ValidationException::withMessages([
                'tenant_slug' => $e->getMessage(),
            ]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Taller creado y provisionado correctamente.']);

        return back();
    }

    public function update(TenantUpdateRequest $request, Tenant $tenant, TenantManager $manager): RedirectResponse
    {
        $tenant->update($request->validated());
        $manager->flushCacheFor($tenant->fresh() ?? $tenant);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Taller actualizado correctamente.']);

        return back();
    }

    public function suspend(Request $request, Tenant $tenant, TenantManager $manager): RedirectResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        if ($tenant->estado === 'suspended') {
            Inertia::flash('toast', ['type' => 'info', 'message' => 'El taller ya estaba suspendido.']);

            return back();
        }

        if ($tenant->estado === 'cancelled') {
            throw ValidationException::withMessages([
                'reason' => 'No se puede suspender un taller cancelado.',
            ]);
        }

        $tenant->update([
            'estado' => 'suspended',
            'suspended_at' => now(),
            'suspension_reason' => $data['reason'],
        ]);

        $subscription = $tenant->subscriptions()
            ->whereIn('estado', ['trial', 'active', 'grace'])
            ->orderByDesc('created_at')
            ->first();

        if ($subscription !== null) {
            $subscription->update([
                'estado' => 'suspended',
                'grace_ends_at' => null,
            ]);
        }

        $manager->flushCacheFor($tenant->fresh() ?? $tenant);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Taller suspendido correctamente.']);

        return back();
    }

    public function resume(Tenant $tenant, TenantManager $manager): RedirectResponse
    {
        if ($tenant->estado !== 'suspended') {
            throw ValidationException::withMessages([
                'estado' => 'Solo se puede reanudar un taller suspendido.',
            ]);
        }

        $subscription = $tenant->subscriptions()
            ->whereIn('estado', ['suspended', 'grace', 'active', 'trial'])
            ->orderByDesc('created_at')
            ->first();

        if ($subscription !== null) {
            $subscription->update([
                'estado' => 'grace',
                'grace_ends_at' => now()->addDay(),
            ]);
        }

        $tenant->update([
            'estado' => 'active',
            'suspended_at' => null,
            'suspension_reason' => null,
        ]);

        $manager->flushCacheFor($tenant->fresh() ?? $tenant);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Taller reanudado correctamente.']);

        return back();
    }

    /**
     * @return Builder<Tenant>
     */
    private function buildBaseQuery(string $search, string $estado): Builder
    {
        $query = Tenant::query();

        if ($search !== '') {
            $query->where(function (Builder $q) use ($search): void {
                $q->where('slug', 'ILIKE', "%{$search}%")
                    ->orWhere('razon_social', 'ILIKE', "%{$search}%")
                    ->orWhere('nombre_comercial', 'ILIKE', "%{$search}%")
                    ->orWhere('email_admin', 'ILIKE', "%{$search}%")
                    ->orWhere('ruc', 'ILIKE', "%{$search}%");
            });
        }

        if ($estado !== 'todos') {
            $query->where('estado', $estado);
        }

        return $query;
    }
}
