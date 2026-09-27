<?php

namespace App\Http\Controllers;

use App\Http\Requests\CobrarOrdenTrabajoRequest;
use App\Http\Requests\LavadoCargosRequest;
use App\Http\Requests\LavadoRequest;
use App\Models\CajaSesion;
use App\Models\Cliente;
use App\Models\Lavado;
use App\Models\LavadoLinea;
use App\Models\Sede;
use App\Models\TallerSetting;
use App\Models\Vehiculo;
use App\Services\Fel\ApisunatCredentialResolver;
use App\Services\Fel\FelEmisionVentaService;
use App\Services\Taller\ServicioKitService;
use App\Services\Venta\VentaCheckoutFromOrdenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class LavadoController extends Controller
{
    public function index(Request $request): Response
    {
        $tenantId = tenant_id();
        abort_if($tenantId === null || $tenantId === '', 403);

        $search = trim((string) $request->string('search', ''));
        $estado = (string) $request->string('estado', 'todos');
        if (! in_array($estado, ['todos', 'abierto', 'cobrado', 'anulado'], true)) {
            $estado = 'todos';
        }

        $query = Lavado::query()->with([
            'cliente:id,nombres,apellidos',
            'sede:id,nombre',
            'lineas:id,lavado_id,cantidad,precio_unitario',
        ]);

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('numero', 'ilike', '%'.$search.'%')
                    ->orWhere('placa', 'ilike', '%'.$search.'%')
                    ->orWhereHas('cliente', function ($cliente) use ($search): void {
                        $cliente->where('nombres', 'ilike', '%'.$search.'%')
                            ->orWhere('apellidos', 'ilike', '%'.$search.'%');
                    });
            });
        }

        if ($estado !== 'todos') {
            $query->where('estado', $estado);
        }

        $lavados = $query->orderByDesc('created_at')->paginate(10)->withQueryString();

        return Inertia::render('taller/lavados/index', [
            'lavados' => $lavados,
            'filters' => [
                'search' => $search,
                'estado' => $estado,
                'per_page' => 10,
            ],
            'stats' => [
                'total' => Lavado::query()->count(),
                'abiertos' => Lavado::query()->where('estado', Lavado::ESTADO_ABIERTO)->count(),
                'cobrados' => Lavado::query()->where('estado', Lavado::ESTADO_COBRADO)->count(),
                'coincidencias' => $lavados->total(),
            ],
            'sedes' => $this->sedesActivas($tenantId),
        ]);
    }

    public function opciones(Request $request): JsonResponse
    {
        abort_if(tenant_id() === null || tenant_id() === '', 403);

        $q = trim((string) $request->string('q', ''));
        $clienteId = trim((string) $request->string('cliente_id', ''));
        $seleccion = trim((string) $request->string('seleccion', ''));
        $vehiculoQ = trim((string) $request->string('vehiculo_q', ''));

        $clientes = Cliente::query()
            ->when($q !== '', function ($query) use ($q): void {
                $query->where(function ($match) use ($q): void {
                    $match->where('nombres', 'ilike', '%'.$q.'%')
                        ->orWhere('apellidos', 'ilike', '%'.$q.'%')
                        ->orWhere('numero_documento', 'ilike', '%'.$q.'%')
                        ->orWhere('telefono', 'ilike', '%'.$q.'%');
                });
            })
            ->orderBy('nombres')
            ->limit(100)
            ->get(['id', 'nombres', 'apellidos', 'tipo_documento', 'numero_documento']);

        if ($seleccion !== '' && $clientes->doesntContain('id', $seleccion)) {
            $elegido = Cliente::query()->whereKey($seleccion)->first([
                'id', 'nombres', 'apellidos', 'tipo_documento', 'numero_documento',
            ]);
            if ($elegido !== null) {
                $clientes->prepend($elegido);
            }
        }

        $vehiculos = $clienteId === ''
            ? collect()
            : Vehiculo::query()
                ->where('cliente_id', $clienteId)
                ->when($vehiculoQ !== '', fn ($query) => $query->where('placa', 'ilike', '%'.$vehiculoQ.'%'))
                ->orderBy('placa')
                ->limit(100)
                ->get(['id', 'cliente_id', 'placa']);

        return response()->json([
            'clientes' => $clientes->map(fn (Cliente $cliente): array => [
                'id' => $cliente->id,
                'nombre' => $cliente->nombreCompleto(),
                'documento' => trim(($cliente->tipo_documento ?? '').' '.($cliente->numero_documento ?? '')),
            ])->values(),
            'vehiculos' => $vehiculos->map(fn (Vehiculo $vehiculo): array => [
                'id' => $vehiculo->id,
                'cliente_id' => $vehiculo->cliente_id,
                'placa' => $vehiculo->placa,
            ])->values(),
        ]);
    }

    public function store(LavadoRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $vehiculoId = $data['vehiculo_id'] ?? null;

        if (is_string($vehiculoId) && $vehiculoId !== '') {
            $vehiculo = Vehiculo::query()->whereKey($vehiculoId)->first();
            if ($vehiculo !== null && (string) $vehiculo->cliente_id !== (string) $data['cliente_id']) {
                throw ValidationException::withMessages([
                    'vehiculo_id' => 'El vehículo no pertenece a ese cliente.',
                ]);
            }
            if ($vehiculo !== null && trim((string) $data['placa']) === '') {
                $data['placa'] = strtoupper((string) $vehiculo->placa);
            }
        }

        $lavado = Lavado::query()->create([
            ...$data,
            'numero' => Lavado::generateNextNumber(),
            'estado' => Lavado::ESTADO_ABIERTO,
            'created_by_id' => Auth::id(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Lavado '.$lavado->numero.' creado.']);

        return redirect()->route('taller.lavados.show', $lavado);
    }

    public function show(Lavado $lavado): Response
    {
        $tenantId = tenant_id();
        abort_if($tenantId === null || $tenantId === '', 403);

        $lavado->load([
            'cliente:id,nombres,apellidos',
            'vehiculo:id,placa',
            'sede:id,nombre',
            'lineas',
            'venta:id,numero,lavado_id',
        ]);

        $setting = TallerSetting::current();

        return Inertia::render('taller/lavados/show', [
            'lavado' => [
                'id' => $lavado->id,
                'numero' => $lavado->numero,
                'placa' => $lavado->placa,
                'estado' => $lavado->estado,
                'notas' => $lavado->notas,
                'sede' => $lavado->sede?->nombre,
                'cliente' => $lavado->cliente?->nombreCompleto(),
                'vehiculo' => $lavado->vehiculo?->placa,
                'venta' => $lavado->venta === null ? null : [
                    'id' => $lavado->venta->id,
                    'numero' => $lavado->venta->numero,
                ],
                'lineas' => $lavado->lineas->map(fn (LavadoLinea $linea) => [
                    'id' => $linea->id,
                    'servicio_id' => $linea->servicio_id,
                    'descripcion' => $linea->descripcion,
                    'cantidad' => (string) $linea->cantidad,
                    'precio_unitario' => (string) $linea->precio_unitario,
                ])->values()->all(),
            ],
            'mi_sesion_abierta' => CajaSesion::query()
                ->where('estado', CajaSesion::ESTADO_ABIERTA)
                ->where('opened_by_id', Auth::id())
                ->first(['id', 'sede_id']),
            'igv' => [
                'igv_porcentaje' => $setting->igvPorcentajeEfectivo(),
                'precio_incluye_igv' => (bool) $setting->precio_incluye_igv,
                'moneda' => $setting->moneda === 'USD' ? 'USD' : 'PEN',
            ],
            'fel_ready' => (bool) $setting->emite_comprobantes_sunat
                && ApisunatCredentialResolver::estaConfigurado($setting),
            'servicios' => app(ServicioKitService::class)->catalogoActivos(),
        ]);
    }

    public function syncCargos(LavadoCargosRequest $request, Lavado $lavado): RedirectResponse
    {
        $this->assertAbierto($lavado);
        $this->replaceLineas($lavado, $request->validated('lineas'));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cargos guardados.']);

        return back();
    }

    public function cobrar(
        CobrarOrdenTrabajoRequest $request,
        Lavado $lavado,
        VentaCheckoutFromOrdenService $checkout,
        FelEmisionVentaService $fel,
    ): RedirectResponse {
        $this->assertAbierto($lavado);

        $payload = $request->validated();
        $this->replaceLineas($lavado, $payload['lineas']);

        $venta = $checkout->cobrarLavado($lavado, $payload, $request->user());

        if ($fel->puedeEmitir(TallerSetting::current(), $venta)) {
            try {
                $doc = $fel->emitir($venta);
                Inertia::flash('toast', [
                    'type' => 'success',
                    'message' => 'Cobro registrado y comprobante '.$doc->numero_completo.' emitido.',
                ]);
            } catch (ValidationException $e) {
                Inertia::flash('toast', [
                    'type' => 'warning',
                    'message' => 'Cobro registrado. SUNAT: '.($e->validator->errors()->first() ?: $e->getMessage()),
                ]);
            }
        } else {
            Inertia::flash('toast', ['type' => 'success', 'message' => 'Cobro registrado. Puedes imprimir el ticket.']);
        }

        return redirect()->route('caja.ventas.show', [
            'venta' => $venta,
            'imprimir' => 1,
        ]);
    }

    public function anular(Lavado $lavado): RedirectResponse
    {
        $this->assertAbierto($lavado);
        $lavado->update(['estado' => Lavado::ESTADO_ANULADO]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Lavado anulado.']);

        return redirect()->route('taller.lavados.index');
    }

    /**
     * @param  list<array{servicio_id?: string|null, descripcion?: string, concepto?: string, cantidad: mixed, precio_unitario: mixed}>  $lineas
     */
    private function replaceLineas(Lavado $lavado, array $lineas): void
    {
        $lavado->lineas()->delete();

        foreach (array_values($lineas) as $i => $linea) {
            $servicioId = isset($linea['servicio_id']) && is_string($linea['servicio_id']) && $linea['servicio_id'] !== ''
                ? $linea['servicio_id']
                : null;
            $descripcion = trim((string) ($linea['descripcion'] ?? $linea['concepto'] ?? ''));

            LavadoLinea::query()->create([
                'lavado_id' => $lavado->id,
                'servicio_id' => $servicioId,
                'descripcion' => $descripcion,
                'cantidad' => $linea['cantidad'],
                'precio_unitario' => $linea['precio_unitario'],
                'orden' => $i,
            ]);
        }
    }

    private function assertAbierto(Lavado $lavado): void
    {
        if ($lavado->estado !== Lavado::ESTADO_ABIERTO) {
            throw ValidationException::withMessages([
                'lavado' => 'Este lavado ya no se puede modificar.',
            ]);
        }
    }

    private function sedesActivas(string $tenantId): mixed
    {
        return Sede::query()
            ->where('tenant_id', $tenantId)
            ->where('activa', true)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'codigo']);
    }
}
