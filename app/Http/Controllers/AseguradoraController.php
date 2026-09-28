<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsToApiPeruConsulta;
use App\Http\Requests\AseguradoraRequest;
use App\Models\Aseguradora;
use App\Services\Integrations\ApiPeruRucService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AseguradoraController extends Controller
{
    use RespondsToApiPeruConsulta;

    public function consultaRuc(Request $request, ApiPeruRucService $apiPeru): JsonResponse
    {
        $ruc = preg_replace('/\D+/', '', (string) $request->query('ruc', '')) ?? '';

        $validated = validator(
            ['ruc' => $ruc],
            ['ruc' => ['required', 'string', 'regex:/^[0-9]{11}$/']],
        )->validate();

        return $this->consultaApiPeruResponse(
            fn () => $apiPeru->consultar($validated['ruc']),
        );
    }

    public function index(Request $request): Response
    {
        abort_if(tenant_id() === null || tenant_id() === '', 403);

        $search = trim((string) $request->string('search', ''));
        $estado = (string) $request->string('estado', 'todos');
        if (! in_array($estado, ['todos', 'activos', 'inactivos'], true)) {
            $estado = 'todos';
        }

        $query = Aseguradora::query();

        if ($search !== '') {
            $query->where(function ($inner) use ($search): void {
                $inner->where('nombre', 'ilike', '%'.$search.'%')
                    ->orWhere('ruc', 'ilike', '%'.$search.'%');
            });
        }

        if ($estado === 'activos') {
            $query->where('activo', true);
        } elseif ($estado === 'inactivos') {
            $query->where('activo', false);
        }

        $aseguradoras = $query->orderBy('nombre')->paginate(10)->withQueryString();

        return Inertia::render('taller/aseguradoras/index', [
            'aseguradoras' => $aseguradoras,
            'filters' => [
                'search' => $search,
                'estado' => $estado,
            ],
            'stats' => [
                'total' => Aseguradora::query()->count(),
                'activos' => Aseguradora::query()->where('activo', true)->count(),
                'coincidencias' => $aseguradoras->total(),
            ],
        ]);
    }

    public function store(AseguradoraRequest $request): RedirectResponse
    {
        Aseguradora::query()->create([
            ...$request->validated(),
            'created_by_id' => Auth::id(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Aseguradora creada.']);

        return back();
    }

    public function update(AseguradoraRequest $request, Aseguradora $aseguradora): RedirectResponse
    {
        $aseguradora->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Aseguradora actualizada.']);

        return back();
    }

    public function destroy(Aseguradora $aseguradora): RedirectResponse
    {
        $aseguradora->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Aseguradora eliminada.']);

        return back();
    }
}
