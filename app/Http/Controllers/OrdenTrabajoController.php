<?php

namespace App\Http\Controllers;

use App\Http\Requests\AvisarOrdenListaRequest;
use App\Http\Requests\CobrarOrdenTrabajoRequest;
use App\Http\Requests\OrdenTrabajoRequest;
use App\Models\CajaSesion;
use App\Models\Cliente;
use App\Models\OrdenTrabajo;
use App\Models\OrdenTrabajoFoto;
use App\Models\Producto;
use App\Models\Sede;
use App\Models\TallerSetting;
use App\Models\Vehiculo;
use App\Services\Fel\FelEmisionVentaService;
use App\Services\Taller\AvisarOrdenListaService;
use App\Services\Taller\OrdenTrabajoLineasService;
use App\Services\Taller\ServicioKitService;
use App\Services\Venta\VentaCheckoutFromOrdenService;
use App\Support\Fel\ApisunatCredentialResolver;
use App\Tenancy\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OrdenTrabajoController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = [
        'numero',
        'estado',
        'ingreso_at',
        'prometida_at',
        'total',
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
        if ($estado !== 'todas' && ! in_array($estado, OrdenTrabajo::ESTADOS, true)) {
            $estado = 'todas';
        }

        $tz = (string) config('app.timezone', 'America/Lima');
        $hoy = now($tz)->toDateString();
        $defaultDesde = $hoy;
        $defaultHasta = $hoy;

        $fechaDesde = $this->parseDateParam($request->query('fecha_desde'));
        $fechaHasta = $this->parseDateParam($request->query('fecha_hasta'));

        if ($fechaDesde === null || $fechaHasta === null) {
            $fechaDesde = $defaultDesde;
            $fechaHasta = $defaultHasta;
        } elseif ($fechaDesde > $fechaHasta) {
            [$fechaDesde, $fechaHasta] = [$fechaHasta, $fechaDesde];
        }

        $query = OrdenTrabajo::query()
            ->with([
                'cliente:id,nombres,apellidos,telefono,tipo_documento,numero_documento',
                'vehiculo:id,placa,marca_id,modelo_id',
                'vehiculo.marca:id,nombre',
                'vehiculo.modelo:id,nombre',
                'sede:id,nombre,codigo',
                'lineas',
                'fotos',
            ])
            ->whereRaw('DATE(created_at) >= ?', [$fechaDesde])
            ->whereRaw('DATE(created_at) <= ?', [$fechaHasta]);

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            $query->orderByDesc('created_at');
        } else {
            $query->orderByDesc('created_at');
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('numero', 'ILIKE', "%{$search}%")
                    ->orWhere('solicitud_cliente', 'ILIKE', "%{$search}%")
                    ->orWhereHas('cliente', function ($c) use ($search) {
                        $c->where('nombres', 'ILIKE', "%{$search}%")
                            ->orWhere('apellidos', 'ILIKE', "%{$search}%");
                    })
                    ->orWhereHas('vehiculo', function ($v) use ($search) {
                        $v->where('placa', 'ILIKE', "%{$search}%");
                    });
            });
        }

        if ($estado !== 'todas') {
            $query->where('estado', $estado);
        }

        $ordenes = $query->paginate($perPage)->withQueryString();

        $statsBase = OrdenTrabajo::query()
            ->whereRaw('DATE(created_at) >= ?', [$fechaDesde])
            ->whereRaw('DATE(created_at) <= ?', [$fechaHasta]);

        $counts = (clone $statsBase)
            ->selectRaw('estado, count(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado');

        $setting = TallerSetting::current();

        return Inertia::render('taller/ordenes-trabajo/index', [
            'ordenes' => $ordenes,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estado,
                'fecha_desde' => $fechaDesde,
                'fecha_hasta' => $fechaHasta,
            ],
            'orden_filtro_ui' => [
                'default_desde' => $defaultDesde,
                'default_hasta' => $defaultHasta,
                'timezone' => $tz,
            ],
            'stats' => [
                'total' => (clone $statsBase)->count(),
                'abiertas' => (int) ($counts[OrdenTrabajo::ESTADO_ABIERTA] ?? 0),
                'en_proceso' => (int) ($counts[OrdenTrabajo::ESTADO_EN_PROCESO] ?? 0),
                'listas' => (int) ($counts[OrdenTrabajo::ESTADO_LISTA] ?? 0),
                'coincidencias' => $ordenes->total(),
            ],
            ...$this->ordenCatalogProps($tenantId, $setting),
        ]);
    }

    public function show(OrdenTrabajo $orden_trabajo): Response
    {
        $tenantId = tenant_id();
        abort_if($tenantId === null || $tenantId === '', 403);

        $orden_trabajo->load([
            'cliente:id,nombres,apellidos,telefono,tipo_documento,numero_documento',
            'vehiculo:id,placa,marca_id,modelo_id,cliente_id',
            'vehiculo.marca:id,nombre',
            'vehiculo.modelo:id,nombre',
            'sede:id,nombre,codigo',
            'lineas',
            'fotos',
            'cita:id,motivo,inicia_at',
        ]);

        $setting = TallerSetting::current();

        return Inertia::render('taller/ordenes-trabajo/show', [
            'orden' => $orden_trabajo,
            ...$this->ordenCatalogProps($tenantId, $setting),
        ]);
    }

    public function cobrar(
        CobrarOrdenTrabajoRequest $request,
        OrdenTrabajo $orden_trabajo,
        VentaCheckoutFromOrdenService $checkout,
        FelEmisionVentaService $fel,
    ): RedirectResponse {
        $venta = $checkout->cobrar($orden_trabajo, $request->validated(), $request->user());

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

    public function avisarLista(
        AvisarOrdenListaRequest $request,
        OrdenTrabajo $orden_trabajo,
        AvisarOrdenListaService $avisar,
    ): RedirectResponse {
        $data = $request->validated();
        $result = $avisar->avisar(
            $orden_trabajo,
            (string) $data['telefono'],
            $data['mensaje'] ?? null,
            (bool) ($data['guardar_en_cliente'] ?? false),
        );

        if ($result['enviado']) {
            Inertia::flash('toast', ['type' => 'success', 'message' => 'Aviso enviado por WhatsApp.']);
        } elseif ($result['encolado']) {
            Inertia::flash('toast', [
                'type' => 'info',
                'message' => 'Aviso encolado. Se enviará cuando WhatsApp esté conectado. También puedes completar el envío en la ventana que se abre.',
            ]);
            if (is_string($result['wa_url'])) {
                Inertia::flash('whatsapp_url', $result['wa_url']);
            }
        } else {
            Inertia::flash('toast', [
                'type' => 'success',
                'message' => 'Se registró el aviso. Completa el envío en WhatsApp.',
            ]);
            if (is_string($result['wa_url'])) {
                Inertia::flash('whatsapp_url', $result['wa_url']);
            }
        }

        return back();
    }

    public function store(OrdenTrabajoRequest $request, OrdenTrabajoLineasService $lineas): RedirectResponse
    {
        $data = $request->validated();
        $payloadLineas = $data['lineas'] ?? null;
        unset($data['lineas']);

        $orden = OrdenTrabajo::create([
            ...$data,
            'numero' => OrdenTrabajo::generateNextNumber(),
            'estado' => OrdenTrabajo::ESTADO_ABIERTA,
            'ingreso_at' => now(),
            'created_by_id' => Auth::id(),
        ]);

        if ($this->lineasTienenContenido($payloadLineas)) {
            $lineas->sync($orden, $payloadLineas);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Orden de trabajo creada correctamente.']);

        return redirect()->route('taller.ordenes-trabajo.show', $orden);
    }

    public function update(OrdenTrabajoRequest $request, OrdenTrabajo $orden_trabajo, OrdenTrabajoLineasService $lineas): RedirectResponse
    {
        $data = $request->validated();
        $payloadLineas = array_key_exists('lineas', $data) ? $data['lineas'] : null;
        unset($data['lineas']);
        $nuevoEstado = $data['estado'] ?? $orden_trabajo->estado;

        if ($nuevoEstado === OrdenTrabajo::ESTADO_EN_PROCESO && $orden_trabajo->en_proceso_at === null) {
            $data['en_proceso_at'] = now();
        }

        if ($nuevoEstado === OrdenTrabajo::ESTADO_LISTA && $orden_trabajo->lista_at === null) {
            $data['lista_at'] = now();
            if ($orden_trabajo->en_proceso_at === null) {
                $data['en_proceso_at'] = now();
            }
        }

        if ($nuevoEstado === OrdenTrabajo::ESTADO_ENTREGADA && $orden_trabajo->entregada_at === null) {
            $data['entregada_at'] = now();
            $data['closed_by_id'] = Auth::id();
        }

        if ($nuevoEstado === OrdenTrabajo::ESTADO_ANULADA && $orden_trabajo->anulada_at === null) {
            $data['anulada_at'] = now();
        }

        $orden_trabajo->update($data);

        if (is_array($payloadLineas) && ($this->lineasTienenContenido($payloadLineas) || $orden_trabajo->lineas()->exists())) {
            $lineas->sync($orden_trabajo, $payloadLineas);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Orden de trabajo actualizada correctamente.']);

        return back();
    }

    public function destroy(OrdenTrabajo $orden_trabajo): RedirectResponse
    {
        $orden_trabajo->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Orden de trabajo eliminada correctamente.']);

        return back();
    }

    public function storeFoto(
        Request $request,
        OrdenTrabajo $orden_trabajo,
        TenantManager $tenants,
    ): RedirectResponse {
        if ($orden_trabajo->estado === OrdenTrabajo::ESTADO_ANULADA) {
            throw ValidationException::withMessages([
                'foto' => 'No se pueden agregar fotos a una orden anulada.',
            ]);
        }

        $data = $request->validate([
            'foto' => ['required', 'image', 'max:5120'],
            'etapa' => ['required', 'string', 'in:'.implode(',', OrdenTrabajoFoto::ETAPAS)],
            'nota' => ['nullable', 'string', 'max:500'],
        ]);

        $slug = $tenants->slug() ?? 'shared';
        $file = $request->file('foto');
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'jpg');
        $filename = Str::uuid()->toString().'.'.$extension;
        $dir = "tenants/{$slug}/ordenes/{$orden_trabajo->id}";

        Storage::disk('public')->putFileAs($dir, $file, $filename, 'public');

        OrdenTrabajoFoto::query()->create([
            'orden_trabajo_id' => $orden_trabajo->id,
            'path' => "{$dir}/{$filename}",
            'etapa' => $data['etapa'],
            'nota' => $data['nota'] ?? null,
            'created_by_id' => Auth::id(),
        ]);

        $etapaLabel = match ($data['etapa']) {
            OrdenTrabajoFoto::ETAPA_INGRESO => 'ingreso',
            OrdenTrabajoFoto::ETAPA_ENTREGA => 'entrega',
            default => 'proceso',
        };

        Inertia::flash('toast', ['type' => 'success', 'message' => "Foto de {$etapaLabel} agregada."]);

        return back();
    }

    public function destroyFoto(OrdenTrabajo $orden_trabajo, OrdenTrabajoFoto $foto): RedirectResponse
    {
        abort_unless($foto->orden_trabajo_id === $orden_trabajo->id, 404);

        $disk = Storage::disk('public');
        if ($foto->path && $disk->exists($foto->path)) {
            $disk->delete($foto->path);
        }

        $foto->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Foto eliminada.']);

        return back();
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => ['uuid'],
        ]);

        $count = OrdenTrabajo::query()->whereIn('id', $data['ids'])->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $count === 1
                ? '1 orden de trabajo eliminada correctamente.'
                : "{$count} órdenes de trabajo eliminadas correctamente.",
        ]);

        return back();
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

    /**
     * @return array<string, mixed>
     */
    private function ordenCatalogProps(string $tenantId, TallerSetting $setting): array
    {
        return [
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
            'mi_sesion_abierta' => CajaSesion::query()
                ->where('estado', CajaSesion::ESTADO_ABIERTA)
                ->where('opened_by_id', Auth::id())
                ->first(['id', 'sede_id', 'opened_at', 'saldo_apertura']),
            'igv' => $setting->only(['igv_porcentaje', 'precio_incluye_igv', 'moneda']),
            'fel_ready' => (bool) $setting->emite_comprobantes_sunat
                && ApisunatCredentialResolver::estaConfigurado($setting),
            'taller_nombre' => $this->tallerDisplayName(),
            'productos' => Producto::query()
                ->where('activo', true)
                ->orderBy('nombre')
                ->limit(400)
                ->get(['id', 'nombre', 'sku', 'precio_venta', 'unidad']),
            'servicios' => app(ServicioKitService::class)->catalogoActivos(),
        ];
    }

    private function tallerDisplayName(): string
    {
        $settings = TallerSetting::current();
        $nombre = trim((string) ($settings->nombre_comercial ?: $settings->razon_social ?: ''));

        return $nombre !== '' ? $nombre : 'el taller';
    }

    private function parseDateParam(mixed $value): ?string
    {
        if (! is_string($value) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            return null;
        }

        return $value;
    }
}
