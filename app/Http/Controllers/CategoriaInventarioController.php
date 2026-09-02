<?php

namespace App\Http\Controllers;

use App\Http\Requests\CategoriaProductoRequest;
use App\Models\CategoriaProducto;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CategoriaInventarioController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = ['nombre', 'orden', 'activo', 'created_at'];

    public function index(Request $request): Response
    {
        abort_if(tenant_id() === null || tenant_id() === '', 403);

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

        $query = CategoriaProducto::query()->withCount('productos');

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            $query->orderByDesc('created_at');
        } else {
            $query->orderBy('orden')->orderBy('nombre');
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('nombre', 'ILIKE', "%{$search}%")
                    ->orWhere('descripcion', 'ILIKE', "%{$search}%");
            });
        }

        if ($estado === 'activa') {
            $query->where('activo', true);
        } elseif ($estado === 'inactiva') {
            $query->where('activo', false);
        }

        $categorias = $query->paginate($perPage)->withQueryString();

        return Inertia::render('inventario/categorias/index', [
            'categorias' => $categorias,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estado,
            ],
            'stats' => [
                'total' => CategoriaProducto::count(),
                'activas' => CategoriaProducto::where('activo', true)->count(),
                'inactivas' => CategoriaProducto::where('activo', false)->count(),
                'coincidencias' => $categorias->total(),
            ],
        ]);
    }

    public function store(CategoriaProductoRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $userId = Auth::id();

        CategoriaProducto::create([
            ...$data,
            'slug' => CategoriaProducto::uniqueSlugFrom($data['nombre']),
            'orden' => CategoriaProducto::generateNextOrden(),
            'created_by_id' => $userId,
            'updated_by_id' => $userId,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Categoría creada correctamente.']);

        return back();
    }

    public function update(CategoriaProductoRequest $request, CategoriaProducto $categoria): RedirectResponse
    {
        $data = $request->validated();

        $categoria->update([
            ...$data,
            'slug' => CategoriaProducto::uniqueSlugFrom($data['nombre'], (string) $categoria->id),
            'updated_by_id' => Auth::id(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Categoría actualizada correctamente.']);

        return back();
    }

    public function destroy(CategoriaProducto $categoria): RedirectResponse
    {
        $categoria->update(['updated_by_id' => Auth::id()]);
        $categoria->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Categoría eliminada correctamente.']);

        return back();
    }
}
