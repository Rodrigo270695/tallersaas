<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCajaEgresoRequest;
use App\Models\CajaEgreso;
use App\Models\CajaSesion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CajaEgresoController extends Controller
{
    public function store(StoreCajaEgresoRequest $request, CajaSesion $caja_sesion): RedirectResponse
    {
        $this->assertPuedeMutar($caja_sesion);

        $data = $request->validated();
        $descripcion = isset($data['descripcion']) ? trim((string) $data['descripcion']) : '';

        CajaEgreso::query()->create([
            'caja_sesion_id' => $caja_sesion->id,
            'monto' => number_format((float) $data['monto'], 2, '.', ''),
            'motivo' => $data['motivo'],
            'descripcion' => $descripcion !== '' ? $descripcion : null,
            'created_by_id' => Auth::id(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Egreso registrado.']);

        return back();
    }

    public function destroy(CajaSesion $caja_sesion, CajaEgreso $egreso): RedirectResponse
    {
        abort_unless(Auth::user()?->can('caja-sesiones.egreso') ?? false, 403);

        if ((string) $egreso->caja_sesion_id !== (string) $caja_sesion->id) {
            abort(404);
        }

        $this->assertPuedeMutar($caja_sesion);

        $egreso->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Egreso eliminado.']);

        return back();
    }

    private function assertPuedeMutar(CajaSesion $sesion): void
    {
        if (! $sesion->estaAbierta()) {
            throw ValidationException::withMessages([
                'monto' => 'No se puede registrar o eliminar egresos en una sesión cerrada.',
            ]);
        }

        if ((string) $sesion->opened_by_id !== (string) Auth::id()) {
            throw ValidationException::withMessages([
                'monto' => 'Solo quien abrió la caja puede registrar o eliminar egresos.',
            ]);
        }
    }
}
