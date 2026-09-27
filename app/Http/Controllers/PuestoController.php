<?php

namespace App\Http\Controllers;

use App\Http\Requests\PuestoRequest;
use App\Models\Puesto;
use App\Models\Sede;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class PuestoController extends Controller
{
    public function index(Request $request): Response
    {
        $tenantId = tenant_id();
        abort_if($tenantId === null || $tenantId === '', 403);

        $search = trim((string) $request->string('search', ''));
        $estado = (string) $request->string('estado', 'todos');
        if (! in_array($estado, ['todos', 'activos', 'inactivos'], true)) {
            $estado = 'todos';
        }

        $query = Puesto::query()->with('sede:id,nombre');

        if ($search !== '') {
            $query->where('nombre', 'ilike', '%'.$search.'%');
        }

        if ($estado === 'activos') {
            $query->where('activo', true);
        } elseif ($estado === 'inactivos') {
            $query->where('activo', false);
        }

        $puestos = $query->orderBy('nombre')->paginate(10)->withQueryString();

        return Inertia::render('taller/puestos/index', [
            'puestos' => $puestos,
            'filters' => [
                'search' => $search,
                'estado' => $estado,
                'per_page' => 10,
            ],
            'stats' => [
                'total' => Puesto::query()->count(),
                'activos' => Puesto::query()->where('activo', true)->count(),
                'coincidencias' => $puestos->total(),
            ],
            'sedes' => Sede::query()
                ->where('tenant_id', $tenantId)
                ->where('activa', true)
                ->orderBy('nombre')
                ->get(['id', 'nombre']),
        ]);
    }

    public function store(PuestoRequest $request): RedirectResponse
    {
        Puesto::query()->create([
            ...$request->validated(),
            'created_by_id' => Auth::id(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Puesto creado.']);

        return back();
    }

    public function update(PuestoRequest $request, Puesto $puesto): RedirectResponse
    {
        $puesto->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Puesto actualizado.']);

        return back();
    }

    public function destroy(Puesto $puesto): RedirectResponse
    {
        $puesto->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Puesto eliminado.']);

        return back();
    }
}
