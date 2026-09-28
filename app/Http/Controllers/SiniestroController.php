<?php

namespace App\Http\Controllers;

use App\Http\Requests\SiniestroRequest;
use App\Models\Aseguradora;
use App\Models\OrdenTrabajo;
use App\Models\Siniestro;
use App\Services\Taller\SiniestroMontos;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class SiniestroController extends Controller
{
    public function index(Request $request): Response
    {
        abort_if(tenant_id() === null || tenant_id() === '', 403);

        $search = trim((string) $request->string('search', ''));
        $estado = (string) $request->string('estado', 'todos');
        if (! in_array($estado, ['todos', ...Siniestro::ESTADOS], true)) {
            $estado = 'todos';
        }

        $query = Siniestro::query()->with([
            'aseguradora:id,nombre',
            'ordenTrabajo:id,numero,total,vehiculo_id',
            'ordenTrabajo.vehiculo:id,placa',
        ]);

        if ($search !== '') {
            $query->where(function ($inner) use ($search): void {
                $inner->where('numero', 'ilike', '%'.$search.'%')
                    ->orWhereHas('ordenTrabajo', function ($orden) use ($search): void {
                        $orden->where('numero', 'ilike', '%'.$search.'%')
                            ->orWhereHas('vehiculo', function ($vehiculo) use ($search): void {
                                $vehiculo->where('placa', 'ilike', '%'.$search.'%');
                            });
                    });
            });
        }

        if ($estado !== 'todos') {
            $query->where('estado', $estado);
        }

        $siniestros = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('taller/siniestros/index', [
            'siniestros' => $siniestros,
            'filters' => [
                'search' => $search,
                'estado' => $estado,
            ],
            'stats' => [
                'total' => Siniestro::query()->count(),
                'abiertos' => Siniestro::query()->where('estado', Siniestro::ESTADO_ABIERTO)->count(),
                'coincidencias' => $siniestros->total(),
            ],
            'aseguradoras' => Aseguradora::query()
                ->where('activo', true)
                ->orderBy('nombre')
                ->get(['id', 'nombre']),
            'ordenes' => OrdenTrabajo::query()
                ->where('estado', '!=', OrdenTrabajo::ESTADO_ANULADA)
                ->with('vehiculo:id,placa,numero_poliza,cobertura_pct,aseguradora_id')
                ->latest('ingreso_at')
                ->limit(200)
                ->get(['id', 'numero', 'total', 'vehiculo_id'])
                ->map(fn (OrdenTrabajo $orden): array => [
                    'id' => $orden->id,
                    'numero' => $orden->numero,
                    'total' => (string) $orden->total,
                    'placa' => $orden->vehiculo?->placa,
                    'numero_poliza' => $orden->vehiculo?->numero_poliza,
                    'cobertura_pct' => $orden->vehiculo?->cobertura_pct,
                    'aseguradora_id' => $orden->vehiculo?->aseguradora_id,
                ]),
        ]);
    }

    public function store(SiniestroRequest $request): RedirectResponse
    {
        $data = $this->payload($request);

        $siniestro = Siniestro::query()->create([
            ...$data,
            'created_by_id' => Auth::id(),
        ]);

        $this->syncPoliza($siniestro, $request);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Siniestro registrado.']);

        return back();
    }

    public function update(SiniestroRequest $request, Siniestro $siniestro): RedirectResponse
    {
        $siniestro->update($this->payload($request));
        $this->syncPoliza($siniestro, $request);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Siniestro actualizado.']);

        return back();
    }

    public function destroy(Siniestro $siniestro): RedirectResponse
    {
        $siniestro->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Siniestro eliminado.']);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(SiniestroRequest $request): array
    {
        $validated = $request->validated();
        $montos = SiniestroMontos::split(
            $validated['monto_reclamado'],
            $validated['cobertura_pct'] ?? null,
            $validated['monto_seguro'] ?? null,
            $validated['monto_cliente'] ?? null,
        );

        return [
            'orden_trabajo_id' => $validated['orden_trabajo_id'],
            'aseguradora_id' => $validated['aseguradora_id'],
            'numero' => $validated['numero'],
            'estado' => $validated['estado'],
            'notas' => $validated['notas'] ?? null,
            ...$montos,
        ];
    }

    private function syncPoliza(Siniestro $siniestro, SiniestroRequest $request): void
    {
        $orden = OrdenTrabajo::query()->with('vehiculo')->find($siniestro->orden_trabajo_id);
        $vehiculo = $orden?->vehiculo;
        if ($vehiculo === null) {
            return;
        }

        $vehiculo->aseguradora_id = $siniestro->aseguradora_id;
        if ($request->filled('numero_poliza')) {
            $vehiculo->numero_poliza = $request->string('numero_poliza')->toString();
        }
        if ($siniestro->cobertura_pct !== null) {
            $vehiculo->cobertura_pct = $siniestro->cobertura_pct;
        }
        $vehiculo->save();
    }
}
