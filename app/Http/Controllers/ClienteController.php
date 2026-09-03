<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsToApiPeruConsulta;
use App\Http\Requests\ClienteRequest;
use App\Models\Cliente;
use App\Services\Integrations\ApiPeruDniService;
use App\Services\Integrations\ApiPeruRucService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClienteController extends Controller
{
    use RespondsToApiPeruConsulta;

    /**
     * Tamaños de página permitidos en el selector del paginador.
     */
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    /**
     * Columnas que pueden usarse para ordenar desde el frontend.
     */
    private const SORTABLE_COLUMNS = ['nombres', 'numero_documento', 'telefono', 'created_at'];

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

        $estado = (string) $request->string('estado', 'todas');
        if (! in_array($estado, ['todas', 'activo', 'inactivo'], true)) {
            $estado = 'todas';
        }

        $query = Cliente::query()->withCount('vehiculos');

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            $query->orderByDesc('created_at');
        } else {
            $query->orderByDesc('created_at');
        }

        if ($estado === 'activo') {
            $query->where('activo', true);
        } elseif ($estado === 'inactivo') {
            $query->where('activo', false);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('nombres', 'ILIKE', "%{$search}%")
                    ->orWhere('apellidos', 'ILIKE', "%{$search}%")
                    ->orWhere('numero_documento', 'ILIKE', "%{$search}%")
                    ->orWhere('telefono', 'ILIKE', "%{$search}%")
                    ->orWhere('email', 'ILIKE', "%{$search}%");
            });
        }

        $clientes = $query->paginate($perPage)->withQueryString();

        return Inertia::render('taller/clientes/index', [
            'clientes' => $clientes,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estado,
            ],
            'stats' => [
                'total' => Cliente::count(),
                'activos' => Cliente::where('activo', true)->count(),
                'inactivos' => Cliente::where('activo', false)->count(),
                'coincidencias' => $clientes->total(),
            ],
        ]);
    }

    /**
     * Consulta DNI en ApiPerú (con respaldo APISUNAT) desde el servidor.
     */
    public function consultaDni(Request $request, ApiPeruDniService $apiPeru): JsonResponse
    {
        $dni = preg_replace('/\D+/', '', (string) $request->query('dni', ''));

        $validated = validator(
            ['dni' => $dni],
            ['dni' => ['required', 'string', 'regex:/^[0-9]{8}$/']],
        )->validate();

        return $this->consultaApiPeruResponse(
            fn () => $apiPeru->consultar($validated['dni']),
        );
    }

    /**
     * Consulta RUC en ApiPerú (con respaldo APISUNAT) desde el servidor.
     */
    public function consultaRuc(Request $request, ApiPeruRucService $apiPeru): JsonResponse
    {
        $ruc = preg_replace('/\D+/', '', (string) $request->query('ruc', ''));

        $validated = validator(
            ['ruc' => $ruc],
            ['ruc' => ['required', 'string', 'regex:/^[0-9]{11}$/']],
        )->validate();

        return $this->consultaApiPeruResponse(
            fn () => $apiPeru->consultar($validated['ruc']),
        );
    }

    public function store(ClienteRequest $request): RedirectResponse
    {
        Cliente::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cliente creado correctamente.']);

        return back();
    }

    public function update(ClienteRequest $request, Cliente $cliente): RedirectResponse
    {
        $cliente->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cliente actualizado correctamente.']);

        return back();
    }

    public function destroy(Cliente $cliente): RedirectResponse
    {
        $cliente->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cliente eliminado correctamente.']);

        return back();
    }

    /**
     * Eliminación masiva de clientes (soft delete) por IDs.
     */
    public function bulkDestroy(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => ['uuid'],
        ]);

        $count = Cliente::query()->whereIn('id', $data['ids'])->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $count === 1
                ? '1 cliente eliminado correctamente.'
                : "{$count} clientes eliminados correctamente.",
        ]);

        return back();
    }
}
