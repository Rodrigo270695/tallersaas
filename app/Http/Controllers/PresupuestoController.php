<?php

namespace App\Http\Controllers;

use App\Http\Requests\EnviarPresupuestoRequest;
use App\Http\Requests\PresupuestoRequest;
use App\Http\Requests\RechazarPresupuestoRequest;
use App\Models\Cliente;
use App\Models\OrdenTrabajo;
use App\Models\Presupuesto;
use App\Models\Producto;
use App\Models\Sede;
use App\Models\TallerSetting;
use App\Models\Vehiculo;
use App\Services\Taller\AplicarPresupuestoAOrdenService;
use App\Services\Taller\CrearPresupuestoDesdeOrdenService;
use App\Services\Taller\EnviarPresupuestoService;
use App\Services\Taller\PresupuestoLineasService;
use App\Services\Taller\ServicioKitService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PresupuestoController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = [
        'numero',
        'estado',
        'total',
        'valido_hasta',
        'created_at',
    ];

    public function index(Request $request): Response
    {
        $tenantId = tenant_id();
        abort_if($tenantId === null || $tenantId === '', 403);

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
        if ($estado !== 'todas' && ! in_array($estado, Presupuesto::ESTADOS, true)) {
            $estado = 'todas';
        }

        $query = Presupuesto::query()
            ->with([
                'cliente:id,nombres,apellidos,telefono',
                'vehiculo:id,placa,marca_id,modelo_id',
                'vehiculo.marca:id,nombre',
                'vehiculo.modelo:id,nombre',
                'sede:id,nombre,codigo',
                'ordenTrabajo:id,numero,estado',
                'items',
            ]);

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            $query->orderByDesc('created_at');
        } else {
            $query->orderByDesc('created_at');
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('numero', 'ILIKE', "%{$search}%")
                    ->orWhereHas('cliente', function ($c) use ($search): void {
                        $c->where('nombres', 'ILIKE', "%{$search}%")
                            ->orWhere('apellidos', 'ILIKE', "%{$search}%");
                    })
                    ->orWhereHas('vehiculo', function ($v) use ($search): void {
                        $v->where('placa', 'ILIKE', "%{$search}%");
                    });
            });
        }

        if ($estado !== 'todas') {
            $query->where('estado', $estado);
        }

        $presupuestos = $query->paginate($perPage)->withQueryString();

        $counts = Presupuesto::query()
            ->selectRaw('estado, count(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado');

        return Inertia::render('taller/presupuestos/index', [
            'presupuestos' => $presupuestos,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estado,
            ],
            'stats' => [
                'total' => Presupuesto::count(),
                'pendientes' => (int) ($counts[Presupuesto::ESTADO_ENVIADO] ?? 0),
                'aprobados' => (int) ($counts[Presupuesto::ESTADO_APROBADO] ?? 0),
                'coincidencias' => $presupuestos->total(),
            ],
            'sedes' => Sede::query()
                ->where('tenant_id', $tenantId)
                ->where('activa', true)
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'codigo']),
            'clientes' => Cliente::query()
                ->orderBy('nombres')
                ->get(['id', 'nombres', 'apellidos'])
                ->map(fn (Cliente $cliente) => [
                    'id' => $cliente->id,
                    'nombre' => $cliente->nombreCompleto(),
                ]),
            'vehiculos' => Vehiculo::query()
                ->with(['marca:id,nombre', 'modelo:id,nombre'])
                ->orderBy('placa')
                ->get(['id', 'cliente_id', 'placa', 'marca_id', 'modelo_id'])
                ->map(fn (Vehiculo $vehiculo) => [
                    'id' => $vehiculo->id,
                    'cliente_id' => $vehiculo->cliente_id,
                    'label' => trim($vehiculo->placa.' '.$vehiculo->marca?->nombre.' '.$vehiculo->modelo?->nombre),
                ]),
            'ordenes' => OrdenTrabajo::query()
                ->whereNotIn('estado', [OrdenTrabajo::ESTADO_ANULADA, OrdenTrabajo::ESTADO_ENTREGADA])
                ->orderByDesc('created_at')
                ->limit(200)
                ->get(['id', 'numero', 'cliente_id', 'vehiculo_id', 'sede_id'])
                ->map(fn (OrdenTrabajo $orden) => [
                    'id' => $orden->id,
                    'numero' => $orden->numero,
                    'cliente_id' => $orden->cliente_id,
                    'vehiculo_id' => $orden->vehiculo_id,
                    'sede_id' => $orden->sede_id,
                ]),
            'igv' => TallerSetting::current()->only(['igv_porcentaje', 'precio_incluye_igv', 'moneda']),
            'taller_nombre' => $this->tallerDisplayName(),
            'productos' => Producto::query()
                ->where('activo', true)
                ->orderBy('nombre')
                ->limit(400)
                ->get(['id', 'nombre', 'sku', 'precio_venta', 'unidad']),
            'servicios' => app(ServicioKitService::class)->catalogoActivos(),
        ]);
    }

    public function store(PresupuestoRequest $request, PresupuestoLineasService $lineas): RedirectResponse
    {
        $data = $request->validated();
        $payloadLineas = $data['lineas'] ?? null;
        unset($data['lineas']);

        $presupuesto = Presupuesto::query()->create([
            ...$data,
            'numero' => Presupuesto::generateNextNumber(),
            'estado' => Presupuesto::ESTADO_BORRADOR,
            'valido_hasta' => $data['valido_hasta'] ?? now()->addDays(7)->toDateString(),
            'created_by_id' => Auth::id(),
        ]);

        if ($this->lineasTienenContenido($payloadLineas)) {
            $lineas->sync($presupuesto, $payloadLineas);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Presupuesto creado correctamente.']);

        return back();
    }

    public function update(PresupuestoRequest $request, Presupuesto $presupuesto, PresupuestoLineasService $lineas): RedirectResponse
    {
        if (! $presupuesto->puedeEditarse()) {
            throw ValidationException::withMessages([
                'presupuesto' => 'Este presupuesto ya no se puede editar.',
            ]);
        }

        $data = $request->validated();
        $payloadLineas = array_key_exists('lineas', $data) ? $data['lineas'] : null;
        unset($data['lineas']);

        $presupuesto->update($data);

        if (is_array($payloadLineas) && ($this->lineasTienenContenido($payloadLineas) || $presupuesto->items()->exists())) {
            $lineas->sync($presupuesto, $payloadLineas);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Presupuesto actualizado correctamente.']);

        return back();
    }

    public function destroy(Presupuesto $presupuesto): RedirectResponse
    {
        if (! in_array($presupuesto->estado, [Presupuesto::ESTADO_BORRADOR, Presupuesto::ESTADO_RECHAZADO, Presupuesto::ESTADO_VENCIDO], true)) {
            throw ValidationException::withMessages([
                'presupuesto' => 'Solo puedes eliminar presupuestos en borrador, rechazados o vencidos.',
            ]);
        }

        $presupuesto->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Presupuesto eliminado correctamente.']);

        return back();
    }

    public function enviar(
        EnviarPresupuestoRequest $request,
        Presupuesto $presupuesto,
        EnviarPresupuestoService $enviar,
    ): RedirectResponse {
        $data = $request->validated();
        $result = $enviar->enviar(
            $presupuesto,
            (string) $data['telefono'],
            $data['mensaje'] ?? null,
            (bool) ($data['guardar_en_cliente'] ?? false),
        );

        $this->flashWhatsAppResult($result, 'Presupuesto enviado al cliente.');

        return back();
    }

    public function aprobar(Presupuesto $presupuesto, AplicarPresupuestoAOrdenService $service): RedirectResponse
    {
        $service->aprobar($presupuesto);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Presupuesto marcado como aprobado.']);

        return back();
    }

    public function rechazar(
        RechazarPresupuestoRequest $request,
        Presupuesto $presupuesto,
        AplicarPresupuestoAOrdenService $service,
    ): RedirectResponse {
        $service->rechazar($presupuesto, $request->validated('motivo'));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Presupuesto rechazado.']);

        return back();
    }

    public function aplicar(Presupuesto $presupuesto, AplicarPresupuestoAOrdenService $service): RedirectResponse
    {
        $orden = $service->aplicar($presupuesto);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Presupuesto aplicado a la orden {$orden->numero}.",
        ]);

        return back();
    }

    public function desdeOrden(
        OrdenTrabajo $orden_trabajo,
        CrearPresupuestoDesdeOrdenService $crear,
    ): RedirectResponse {
        $crear->crear($orden_trabajo);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Presupuesto creado desde la orden de trabajo.',
        ]);

        return back();
    }

    /**
     * @param  array{enviado: bool, encolado: bool, wa_url: ?string}  $result
     */
    private function flashWhatsAppResult(array $result, string $successMessage): void
    {
        if ($result['enviado']) {
            Inertia::flash('toast', ['type' => 'success', 'message' => $successMessage]);

            return;
        }

        if ($result['encolado']) {
            Inertia::flash('toast', [
                'type' => 'info',
                'message' => 'Presupuesto encolado. Se enviará cuando WhatsApp esté conectado. También puedes completar el envío en la ventana que se abre.',
            ]);
            if (is_string($result['wa_url'])) {
                Inertia::flash('whatsapp_url', $result['wa_url']);
            }

            return;
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Presupuesto registrado como enviado. Completa el envío en WhatsApp.',
        ]);
        if (is_string($result['wa_url'])) {
            Inertia::flash('whatsapp_url', $result['wa_url']);
        }
    }

    private function lineasTienenContenido(mixed $lineas): bool
    {
        if (! is_array($lineas) || $lineas === []) {
            return false;
        }

        foreach ($lineas as $linea) {
            if (! is_array($linea)) {
                continue;
            }

            $descripcion = trim((string) ($linea['descripcion'] ?? ''));
            $servicioId = trim((string) ($linea['servicio_id'] ?? ''));
            $productoId = trim((string) ($linea['producto_id'] ?? ''));

            if ($descripcion !== '' || $servicioId !== '' || $productoId !== '') {
                return true;
            }
        }

        return false;
    }

    private function tallerDisplayName(): string
    {
        $settings = TallerSetting::current();
        $nombre = trim((string) ($settings->nombre_comercial ?: $settings->razon_social ?: ''));

        return $nombre !== '' ? $nombre : 'el taller';
    }
}
