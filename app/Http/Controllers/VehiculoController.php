<?php

namespace App\Http\Controllers;

use App\Http\Requests\VehiculoRequest;
use App\Models\Cliente;
use App\Models\Vehiculo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VehiculoController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = ['placa', 'marca', 'modelo', 'anio', 'created_at'];

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

        $query = Vehiculo::query()->with('cliente:id,nombres,apellidos');

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            $query->orderByDesc('created_at');
        } else {
            $query->orderByDesc('created_at');
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('placa', 'ILIKE', "%{$search}%")
                    ->orWhere('marca', 'ILIKE', "%{$search}%")
                    ->orWhere('modelo', 'ILIKE', "%{$search}%")
                    ->orWhere('vin', 'ILIKE', "%{$search}%")
                    ->orWhereHas('cliente', function ($c) use ($search) {
                        $c->where('nombres', 'ILIKE', "%{$search}%")
                            ->orWhere('apellidos', 'ILIKE', "%{$search}%");
                    });
            });
        }

        $vehiculos = $query->paginate($perPage)->withQueryString();

        return Inertia::render('taller/vehiculos/index', [
            'vehiculos' => $vehiculos,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
            ],
            'stats' => [
                'total' => Vehiculo::count(),
                'coincidencias' => $vehiculos->total(),
            ],
            // Catálogo liviano para el select del modal de crear/editar.
            'clientes' => Cliente::query()
                ->orderBy('nombres')
                ->get(['id', 'nombres', 'apellidos'])
                ->map(fn (Cliente $cliente) => [
                    'id' => $cliente->id,
                    'nombre' => $cliente->nombreCompleto(),
                ]),
        ]);
    }

    public function store(VehiculoRequest $request): RedirectResponse
    {
        Vehiculo::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Vehículo creado correctamente.']);

        return back();
    }

    public function update(VehiculoRequest $request, Vehiculo $vehiculo): RedirectResponse
    {
        $vehiculo->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Vehículo actualizado correctamente.']);

        return back();
    }

    public function destroy(Vehiculo $vehiculo): RedirectResponse
    {
        $vehiculo->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Vehículo eliminado correctamente.']);

        return back();
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => ['uuid'],
        ]);

        $count = Vehiculo::query()->whereIn('id', $data['ids'])->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $count === 1
                ? '1 vehículo eliminado correctamente.'
                : "{$count} vehículos eliminados correctamente.",
        ]);

        return back();
    }
}
