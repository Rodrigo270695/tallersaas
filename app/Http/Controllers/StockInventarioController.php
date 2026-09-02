<?php

namespace App\Http\Controllers;

use App\Http\Requests\StockInventarioAdjustRequest;
use App\Models\Producto;
use App\Models\Sede;
use App\Services\Inventario\InventarioStockService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StockInventarioController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = ['nombre', 'sku', 'unidad', 'cantidad_stock', 'created_at'];

    public function index(Request $request): Response
    {
        $tenantId = tenant_id();
        abort_if($tenantId === null || $tenantId === '', 403);

        $search = trim((string) $request->string('search', ''));
        $perPageRequested = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPageRequested, self::PER_PAGE_OPTIONS, true) ? $perPageRequested : 10;

        $sort = (string) $request->string('sort', '');
        $direction = strtolower((string) $request->string('direction', 'asc'));
        $sortValid = in_array($sort, self::SORTABLE_COLUMNS, true);
        $directionValid = in_array($direction, ['asc', 'desc'], true);
        $directionSql = $directionValid ? $direction : 'asc';

        $sedesActivas = Sede::query()
            ->where('tenant_id', $tenantId)
            ->where('activa', true)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'codigo']);

        $sedeIds = $sedesActivas->pluck('id')->all();
        $sedeRequested = (string) $request->string('sede_id', '');
        $sedeId = in_array($sedeRequested, $sedeIds, true)
            ? $sedeRequested
            : (string) ($sedesActivas->first()?->id ?? '');

        if ($sedesActivas->isEmpty() || $sedeId === '') {
            return Inertia::render('inventario/stock/index', [
                'productos' => Producto::query()->whereRaw('1 = 0')->paginate($perPage)->withQueryString(),
                'filters' => [
                    'search' => $search,
                    'per_page' => $perPage,
                    'sort' => $sortValid ? $sort : null,
                    'direction' => $sortValid && $directionValid ? $direction : null,
                    'sede_id' => $sedeId,
                ],
                'stats' => [
                    'total' => Producto::count(),
                    'coincidencias' => 0,
                    'bajo_minimo' => 0,
                ],
                'sede_options' => $sedesActivas,
                'sin_sedes' => true,
            ]);
        }

        $query = Producto::query()
            ->with(['categoria:id,nombre'])
            ->leftJoin('existencias_sede as es', function ($join) use ($sedeId): void {
                $join->on('es.producto_id', '=', 'productos.id')
                    ->where('es.sede_id', '=', $sedeId);
            })
            ->select('productos.*')
            ->addSelect(DB::raw('COALESCE(es.cantidad, 0) as cantidad_stock'));

        if ($sortValid && $sort === 'cantidad_stock') {
            $query->orderByRaw('COALESCE(es.cantidad, 0) '.$directionSql);
            $query->orderBy('productos.nombre');
        } elseif ($sortValid) {
            $query->orderBy('productos.'.$sort, $directionSql);
        } else {
            $query->orderBy('productos.nombre');
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('productos.nombre', 'ILIKE', "%{$search}%")
                    ->orWhere('productos.sku', 'ILIKE', "%{$search}%");
            });
        }

        $productos = $query->paginate($perPage)->withQueryString();

        $bajoMinimo = Producto::query()
            ->leftJoin('existencias_sede as es', function ($join) use ($sedeId): void {
                $join->on('es.producto_id', '=', 'productos.id')
                    ->where('es.sede_id', '=', $sedeId);
            })
            ->whereNotNull('productos.stock_minimo')
            ->whereRaw('COALESCE(es.cantidad, 0) < productos.stock_minimo')
            ->count();

        return Inertia::render('inventario/stock/index', [
            'productos' => $productos,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'sede_id' => $sedeId,
            ],
            'stats' => [
                'total' => Producto::count(),
                'coincidencias' => $productos->total(),
                'bajo_minimo' => $bajoMinimo,
            ],
            'sede_options' => $sedesActivas,
            'sin_sedes' => false,
        ]);
    }

    public function adjust(StockInventarioAdjustRequest $request, InventarioStockService $stock): RedirectResponse
    {
        $data = $request->validated();

        $stock->ajustarACantidad(
            $data['producto_id'],
            $data['sede_id'],
            (string) $data['cantidad'],
            'Ajuste de stock (panel)',
            Auth::id() !== null ? (string) Auth::id() : null,
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Stock actualizado correctamente.']);

        return back();
    }
}
