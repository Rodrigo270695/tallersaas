<?php

namespace App\Http\Controllers;

use App\Http\Requests\MovimientoInventarioStoreRequest;
use App\Models\MovimientoInventario;
use App\Models\Producto;
use App\Models\Sede;
use App\Services\Inventario\InventarioStockService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class MovimientoInventarioController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = ['created_at', 'tipo', 'delta'];

    public function index(Request $request): Response
    {
        $tenantId = tenant_id();
        abort_if($tenantId === null || $tenantId === '', 403);

        $search = trim((string) $request->string('search', ''));
        $perPageRequested = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPageRequested, self::PER_PAGE_OPTIONS, true) ? $perPageRequested : 10;

        $sort = (string) $request->string('sort', '');
        $direction = strtolower((string) $request->string('direction', 'desc'));
        $sortValid = in_array($sort, self::SORTABLE_COLUMNS, true);
        $directionValid = in_array($direction, ['asc', 'desc'], true);

        $tipo = (string) $request->string('tipo', 'todos');
        if ($tipo !== 'todos' && ! in_array($tipo, MovimientoInventario::TIPOS, true)) {
            $tipo = 'todos';
        }

        $tz = (string) config('app.timezone', 'America/Lima');
        $now = now($tz);
        $defaultDesde = $now->copy()->startOfMonth()->toDateString();
        $defaultHasta = $now->toDateString();

        $fechaDesde = $this->parseDateParam($request->query('fecha_desde'));
        $fechaHasta = $this->parseDateParam($request->query('fecha_hasta'));

        if ($fechaDesde === null || $fechaHasta === null) {
            $fechaDesde = $defaultDesde;
            $fechaHasta = $defaultHasta;
        } elseif ($fechaDesde > $fechaHasta) {
            [$fechaDesde, $fechaHasta] = [$fechaHasta, $fechaDesde];
        }

        $sedesActivas = Sede::query()
            ->where('tenant_id', $tenantId)
            ->where('activa', true)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'codigo']);

        $sedeRequested = (string) $request->string('sede_id', '');
        $sedeFiltro = $sedesActivas->contains(fn (Sede $sede) => (string) $sede->id === $sedeRequested)
            ? $sedeRequested
            : '';

        $query = MovimientoInventario::query()
            ->with(['producto:id,nombre,sku', 'creadoPor:id,name'])
            ->whereRaw('DATE(created_at) >= ?', [$fechaDesde])
            ->whereRaw('DATE(created_at) <= ?', [$fechaHasta]);

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'desc');
            if ($sort !== 'created_at') {
                $query->orderByDesc('created_at');
            }
        } else {
            $query->orderByDesc('created_at');
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('notas', 'ILIKE', "%{$search}%")
                    ->orWhereHas('producto', function ($p) use ($search): void {
                        $p->where('nombre', 'ILIKE', "%{$search}%")
                            ->orWhere('sku', 'ILIKE', "%{$search}%");
                    });
            });
        }

        if ($tipo !== 'todos') {
            $query->where('tipo', $tipo);
        }

        if ($sedeFiltro !== '') {
            $query->where('sede_id', $sedeFiltro);
        }

        $movimientos = $query->paginate($perPage)->withQueryString();

        $sedeNombres = Sede::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('id', $movimientos->pluck('sede_id')->unique()->filter()->all())
            ->pluck('nombre', 'id');

        $movimientos->getCollection()->transform(function (MovimientoInventario $mov) use ($sedeNombres): MovimientoInventario {
            $mov->setAttribute('sede_nombre', $sedeNombres[$mov->sede_id] ?? '—');

            return $mov;
        });

        $statsBase = MovimientoInventario::query()
            ->whereRaw('DATE(created_at) >= ?', [$fechaDesde])
            ->whereRaw('DATE(created_at) <= ?', [$fechaHasta])
            ->when($sedeFiltro !== '', fn ($q) => $q->where('sede_id', $sedeFiltro));

        return Inertia::render('inventario/movimientos/index', [
            'movimientos' => $movimientos,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'tipo' => $tipo,
                'sede_id' => $sedeFiltro,
                'fecha_desde' => $fechaDesde,
                'fecha_hasta' => $fechaHasta,
            ],
            'movimiento_filtro_ui' => [
                'default_desde' => $defaultDesde,
                'default_hasta' => $defaultHasta,
                'timezone' => $tz,
            ],
            'stats' => [
                'total' => (clone $statsBase)->count(),
                'coincidencias' => $movimientos->total(),
            ],
            'sede_options' => $sedesActivas,
            'producto_options' => Producto::query()
                ->where('activo', true)
                ->orderBy('nombre')
                ->limit(400)
                ->get(['id', 'nombre', 'sku', 'unidad']),
        ]);
    }

    public function store(MovimientoInventarioStoreRequest $request, InventarioStockService $stock): RedirectResponse
    {
        $data = $request->validated();
        $userId = Auth::id() !== null ? (string) Auth::id() : null;
        $cantidad = (string) $data['cantidad'];

        if ($data['tipo'] === MovimientoInventario::TIPO_ENTRADA) {
            $stock->registrarEntrada(
                $data['producto_id'],
                $data['sede_id'],
                $cantidad,
                $data['notas'] ?? null,
                $userId,
            );
        } else {
            $stock->registrarSalida(
                $data['producto_id'],
                $data['sede_id'],
                $cantidad,
                $data['notas'] ?? null,
                $userId,
                null,
                $data['tipo'],
            );
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Movimiento registrado correctamente.']);

        return back();
    }

    private function parseDateParam(mixed $value): ?string
    {
        if (! is_string($value) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            return null;
        }

        return $value;
    }
}
