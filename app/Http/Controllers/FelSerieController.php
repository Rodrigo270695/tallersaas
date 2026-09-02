<?php

namespace App\Http\Controllers;

use App\Models\FelSerie;
use App\Models\Sede;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class FelSerieController extends Controller
{
    public function index(): Response
    {
        $tenantId = tenant_id();
        abort_if($tenantId === null || $tenantId === '', 403);

        $sedes = Sede::query()
            ->where('tenant_id', $tenantId)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'codigo']);

        $series = FelSerie::query()
            ->with('sede:id,nombre,codigo')
            ->withCount('documentos')
            ->orderBy('sede_id')
            ->orderBy('tipo_comprobante')
            ->get()
            ->map(fn (FelSerie $serie) => [
                'id' => $serie->id,
                'sede_id' => $serie->sede_id,
                'sede' => $serie->sede === null ? null : [
                    'id' => $serie->sede->id,
                    'nombre' => $serie->sede->nombre,
                    'codigo' => $serie->sede->codigo,
                ],
                'tipo_comprobante' => $serie->tipo_comprobante,
                'tipo_label' => FelSerie::labelTipo((int) $serie->tipo_comprobante),
                'serie' => $serie->serie,
                'ultimo_correlativo' => (int) $serie->ultimo_correlativo,
                'activo' => (bool) $serie->activo,
                'tiene_documentos' => (int) $serie->ultimo_correlativo > 0 || (int) $serie->documentos_count > 0,
            ]);

        return Inertia::render('facturacion/series/index', [
            'series' => $series,
            'sedes' => $sedes,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $tenantId = tenant_id();
        abort_if($tenantId === null || $tenantId === '', 403);

        $request->merge([
            'serie' => strtoupper(trim((string) $request->input('serie', ''))),
        ]);

        $data = $request->validate([
            'sede_id' => ['required', 'uuid', Rule::exists('sedes', 'id')->where('tenant_id', $tenantId)],
            'tipo_comprobante' => ['required', 'integer', Rule::in(FelSerie::tiposSunat())],
            'serie' => [
                'required',
                'string',
                'size:4',
                'regex:/^[A-Z0-9]{4}$/',
                Rule::unique('fel_series', 'serie')->where(
                    fn ($q) => $q
                        ->where('sede_id', $request->input('sede_id'))
                        ->where('tipo_comprobante', $request->input('tipo_comprobante')),
                ),
            ],
        ], [], [
            'sede_id' => 'sede',
            'tipo_comprobante' => 'tipo',
            'serie' => 'serie',
        ]);

        FelSerie::query()->create([
            ...$data,
            'ultimo_correlativo' => 0,
            'activo' => true,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Serie creada correctamente.']);

        return back();
    }

    public function update(Request $request, FelSerie $fel_serie): RedirectResponse
    {
        $request->merge(['activo' => $request->boolean('activo')]);

        $data = $request->validate([
            'activo' => ['required', 'boolean'],
        ]);

        $fel_serie->update(['activo' => $data['activo']]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Serie actualizada.']);

        return back();
    }

    public function destroy(FelSerie $fel_serie): RedirectResponse
    {
        if ((int) $fel_serie->ultimo_correlativo > 0 || $fel_serie->documentos()->exists()) {
            throw ValidationException::withMessages([
                'serie' => 'No puedes eliminar una serie que ya emitió comprobantes.',
            ]);
        }

        $fel_serie->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Serie eliminada.']);

        return back();
    }
}
