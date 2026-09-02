<?php

namespace App\Http\Controllers;

use App\Http\Requests\CategoriaServicioRequest;
use App\Models\CategoriaServicio;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CategoriaServicioController extends Controller
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

        $query = CategoriaServicio::query()->withCount('servicios');

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

        return Inertia::render('taller/categorias-servicios/index', [
            'categorias' => $categorias,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estado,
            ],
            'stats' => [
                'total' => CategoriaServicio::count(),
                'activas' => CategoriaServicio::where('activo', true)->count(),
                'inactivas' => CategoriaServicio::where('activo', false)->count(),
                'coincidencias' => $categorias->total(),
            ],
        ]);
    }

    public function store(CategoriaServicioRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $userId = Auth::id();

        CategoriaServicio::create([
            ...$data,
            'slug' => CategoriaServicio::uniqueSlugFrom($data['nombre']),
            'orden' => CategoriaServicio::generateNextOrden(),
            'created_by_id' => $userId,
            'updated_by_id' => $userId,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Categoría creada correctamente.']);

        return back();
    }

    public function update(CategoriaServicioRequest $request, CategoriaServicio $categoria_servicio): RedirectResponse
    {
        $data = $request->validated();

        $categoria_servicio->update([
            ...$data,
            'slug' => CategoriaServicio::uniqueSlugFrom($data['nombre'], (string) $categoria_servicio->id),
            'updated_by_id' => Auth::id(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Categoría actualizada correctamente.']);

        return back();
    }

    public function destroy(CategoriaServicio $categoria_servicio): RedirectResponse
    {
        $categoria_servicio->update(['updated_by_id' => Auth::id()]);
        $categoria_servicio->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Categoría eliminada correctamente.']);

        return back();
    }
}
