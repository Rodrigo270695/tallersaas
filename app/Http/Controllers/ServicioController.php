<?php

namespace App\Http\Controllers;

use App\Http\Requests\ServicioRequest;
use App\Models\CategoriaServicio;
use App\Models\Producto;
use App\Models\Servicio;
use App\Services\Taller\ServicioKitService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ServicioController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = ['nombre', 'precio', 'duracion_minutos', 'activo', 'created_at'];

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

        $categoriaFiltro = (string) $request->string('categoria_id', '');
        $categoriaFiltroUuid = preg_match('/^[0-9a-f-]{36}$/i', $categoriaFiltro) === 1
            ? $categoriaFiltro
            : '';

        $query = Servicio::query()
            ->with([
                'categoria:id,nombre',
                'kitItems' => fn ($q) => $q->orderBy('orden')->with([
                    'producto:id,nombre,sku,unidad,precio_venta',
                ]),
            ])
            ->withCount('kitItems');

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            $query->orderByDesc('created_at');
        } else {
            $query->orderBy('nombre');
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

        if ($categoriaFiltroUuid !== '') {
            $query->where('categoria_id', $categoriaFiltroUuid);
        }

        $servicios = $query->paginate($perPage)->withQueryString();

        return Inertia::render('taller/servicios/index', [
            'servicios' => $servicios,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estado,
                'categoria_id' => $categoriaFiltroUuid,
            ],
            'stats' => [
                'total' => Servicio::count(),
                'activos' => Servicio::where('activo', true)->count(),
                'inactivos' => Servicio::where('activo', false)->count(),
                'coincidencias' => $servicios->total(),
            ],
            'categoria_options' => CategoriaServicio::query()
                ->where('activo', true)
                ->orderBy('orden')
                ->orderBy('nombre')
                ->get(['id', 'nombre']),
            'producto_options' => Producto::query()
                ->where('activo', true)
                ->orderBy('nombre')
                ->limit(400)
                ->get(['id', 'nombre', 'sku', 'unidad', 'precio_venta']),
        ]);
    }

    public function store(ServicioRequest $request, ServicioKitService $kit): RedirectResponse
    {
        $data = $request->validated();
        $hasKit = array_key_exists('kit', $data);
        $kitPayload = $data['kit'] ?? [];
        unset($data['kit']);
        $userId = Auth::id();

        $servicio = Servicio::create([
            ...$data,
            'slug' => Servicio::uniqueSlugFrom($data['nombre']),
            'created_by_id' => $userId,
            'updated_by_id' => $userId,
        ]);

        if ($hasKit) {
            $kit->sync($servicio, $kitPayload);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Servicio creado correctamente.']);

        return back();
    }

    public function update(ServicioRequest $request, Servicio $servicio, ServicioKitService $kit): RedirectResponse
    {
        $data = $request->validated();
        $hasKit = array_key_exists('kit', $data);
        $kitPayload = $data['kit'] ?? [];
        unset($data['kit']);

        $servicio->update([
            ...$data,
            'slug' => Servicio::uniqueSlugFrom($data['nombre'], (string) $servicio->id),
            'updated_by_id' => Auth::id(),
        ]);

        if ($hasKit) {
            $kit->sync($servicio, $kitPayload);
            Inertia::flash('toast', ['type' => 'success', 'message' => 'Kit actualizado correctamente.']);
        } else {
            Inertia::flash('toast', ['type' => 'success', 'message' => 'Servicio actualizado correctamente.']);
        }

        return back();
    }

    public function destroy(Servicio $servicio): RedirectResponse
    {
        $servicio->update(['updated_by_id' => Auth::id()]);
        $servicio->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Servicio eliminado correctamente.']);

        return back();
    }
}
