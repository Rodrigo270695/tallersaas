<?php

namespace App\Http\Controllers;

use App\Http\Requests\UnidadMedidaRequest;
use App\Models\UnidadMedida;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UnidadMedidaController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = [
        'codigo',
        'nombre',
        'orden',
        'activo',
        'created_at',
    ];

    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search', ''));
        $perPageRequested = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPageRequested, self::PER_PAGE_OPTIONS, true)
            ? $perPageRequested
            : 10;

        $sort = (string) $request->string('sort', '');
        $direction = strtolower((string) $request->string('direction', 'asc'));
        $sortValid = in_array($sort, self::SORTABLE_COLUMNS, true);
        $directionValid = in_array($direction, ['asc', 'desc'], true);

        $estado = (string) $request->string('estado', 'todas');
        if (! in_array($estado, ['todas', 'activa', 'inactiva'], true)) {
            $estado = 'todas';
        }

        $query = UnidadMedida::query();

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            $query->orderBy('orden');
        } else {
            $query->orderBy('orden')->orderBy('codigo');
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('codigo', 'ILIKE', "%{$search}%")
                    ->orWhere('nombre', 'ILIKE', "%{$search}%");
            });
        }

        if ($estado === 'activa') {
            $query->where('activo', true);
        } elseif ($estado === 'inactiva') {
            $query->where('activo', false);
        }

        $unidades = $query->paginate($perPage)->withQueryString();

        return Inertia::render('plataforma/unidades-medida/index', [
            'unidades' => $unidades,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estado,
            ],
            'stats' => [
                'total' => UnidadMedida::query()->count(),
                'activas' => UnidadMedida::query()->where('activo', true)->count(),
                'inactivas' => UnidadMedida::query()->where('activo', false)->count(),
                'coincidencias' => $unidades->total(),
            ],
        ]);
    }

    public function store(UnidadMedidaRequest $request): RedirectResponse
    {
        UnidadMedida::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Unidad creada correctamente.']);

        return back();
    }

    public function update(UnidadMedidaRequest $request, UnidadMedida $unidadMedida): RedirectResponse
    {
        $data = $request->validated();

        if ($unidadMedida->codigo !== $data['codigo']) {
            throw ValidationException::withMessages([
                'codigo' => 'No puedes cambiar el código de una unidad ya creada (los repuestos lo usan).',
            ]);
        }

        $unidadMedida->update($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Unidad actualizada correctamente.']);

        return back();
    }

    public function destroy(UnidadMedida $unidadMedida): RedirectResponse
    {
        $unidadMedida->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Unidad eliminada correctamente.']);

        return back();
    }
}
