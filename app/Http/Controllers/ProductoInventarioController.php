<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductoInventarioRequest;
use App\Models\CategoriaProducto;
use App\Models\Producto;
use App\Models\Sede;
use App\Services\Inventario\InventarioStockService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProductoInventarioController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = [
        'nombre',
        'sku',
        'unidad',
        'precio_venta',
        'activo',
        'created_at',
    ];

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

        $estado = (string) $request->string('estado', 'todas');
        if (! in_array($estado, ['todas', 'activa', 'inactiva'], true)) {
            $estado = 'todas';
        }

        $categoriaFiltro = (string) $request->string('categoria_id', '');
        $categoriaFiltroUuid = preg_match('/^[0-9a-f-]{36}$/i', $categoriaFiltro) === 1
            ? $categoriaFiltro
            : '';

        $query = Producto::query()->with(['categoria:id,nombre']);

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            $query->orderByDesc('created_at');
        } else {
            $query->orderBy('nombre');
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('nombre', 'ILIKE', "%{$search}%")
                    ->orWhere('sku', 'ILIKE', "%{$search}%")
                    ->orWhere('codigo_barras', 'ILIKE', "%{$search}%");
            });
        }

        if ($estado === 'activa') {
            $query->where('activo', true);
        } elseif ($estado === 'inactiva') {
            $query->where('activo', false);
        }

        if ($categoriaFiltroUuid !== '') {
            $query->where('categoria_id', $categoriaFiltroUuid);
        }

        $productos = $query->paginate($perPage)->withQueryString();

        return Inertia::render('inventario/productos/index', [
            'productos' => $productos,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estado,
                'categoria_id' => $categoriaFiltroUuid,
            ],
            'stats' => [
                'total' => Producto::count(),
                'activos' => Producto::where('activo', true)->count(),
                'inactivos' => Producto::where('activo', false)->count(),
                'coincidencias' => $productos->total(),
            ],
            'categoria_options' => CategoriaProducto::query()
                ->where('activo', true)
                ->orderBy('orden')
                ->orderBy('nombre')
                ->get(['id', 'nombre']),
            'unidad_options' => Producto::UNIDADES,
            'sede_options' => Sede::query()
                ->where('tenant_id', $tenantId)
                ->where('activa', true)
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'codigo']),
        ]);
    }

    public function store(ProductoInventarioRequest $request, InventarioStockService $stock): RedirectResponse
    {
        $userId = Auth::id();
        $validated = $request->validated();
        $productoData = Arr::except($validated, ['stock_inicial_sede_id', 'stock_inicial_cantidad']);
        $stockSedeId = $validated['stock_inicial_sede_id'] ?? null;
        $stockCantidad = $validated['stock_inicial_cantidad'] ?? null;

        DB::transaction(function () use ($productoData, $userId, $stockSedeId, $stockCantidad, $stock): void {
            $producto = Producto::create([
                ...$productoData,
                'slug' => Producto::uniqueSlugFrom($productoData['nombre']),
                'created_by_id' => $userId,
                'updated_by_id' => $userId,
            ]);

            if (is_string($stockSedeId) && $stockSedeId !== '' && $stockCantidad !== null) {
                $stock->registrarEntrada(
                    (string) $producto->id,
                    $stockSedeId,
                    (string) $stockCantidad,
                    'Stock inicial al crear el repuesto',
                    $userId !== null ? (string) $userId : null,
                );
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Repuesto creado correctamente.']);

        return back();
    }

    public function update(ProductoInventarioRequest $request, Producto $producto): RedirectResponse
    {
        $data = Arr::except($request->validated(), ['stock_inicial_sede_id', 'stock_inicial_cantidad']);

        $producto->update([
            ...$data,
            'slug' => Producto::uniqueSlugFrom($data['nombre'], (string) $producto->id),
            'updated_by_id' => Auth::id(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Repuesto actualizado correctamente.']);

        return back();
    }

    public function destroy(Producto $producto): RedirectResponse
    {
        $producto->update(['updated_by_id' => Auth::id()]);
        $producto->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Repuesto eliminado correctamente.']);

        return back();
    }
}
