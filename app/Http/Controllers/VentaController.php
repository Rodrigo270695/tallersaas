<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreVentaDirectaRequest;
use App\Models\CajaSesion;
use App\Models\Cliente;
use App\Models\OrdenTrabajo;
use App\Models\Producto;
use App\Models\TallerSetting;
use App\Models\Vehiculo;
use App\Models\Venta;
use App\Services\Fel\FelEmisionVentaService;
use App\Services\Taller\ServicioKitService;
use App\Services\Venta\VentaCheckoutFromOrdenService;
use App\Services\Venta\VentaTicketViewService;
use App\Support\Caja\TicketAnchoMm;
use App\Support\Fel\ApisunatCredentialResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Response;

class VentaController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = [
        'numero',
        'fecha_pago',
        'total',
        'estado',
        'created_at',
    ];

    public function index(Request $request): Response
    {
        $tenantId = tenant_id();
        abort_if($tenantId === null || $tenantId === '', 403);

        $search = trim((string) $request->string('search', ''));
        $perPageRequested = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPageRequested, self::PER_PAGE_OPTIONS, true) ? $perPageRequested : 10;

        $sort = (string) $request->string('sort', '');
        $direction = strtolower((string) $request->string('direction', 'desc'));
        $sortValid = in_array($sort, self::SORTABLE_COLUMNS, true);
        $directionValid = in_array($direction, ['asc', 'desc'], true);

        $estado = (string) $request->string('estado', 'todas');
        if ($estado !== 'todas' && ! in_array($estado, [Venta::ESTADO_PAGADO, Venta::ESTADO_ANULADO], true)) {
            $estado = 'todas';
        }

        $query = Venta::query()
            ->with([
                'cliente:id,nombres,apellidos',
                'vehiculo:id,placa',
                'ordenTrabajo:id,numero',
                'sede:id,nombre',
            ]);

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'desc');
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
                    ->orWhereHas('ordenTrabajo', function ($ot) use ($search): void {
                        $ot->where('numero', 'ILIKE', "%{$search}%");
                    });
            });
        }

        if ($estado !== 'todas') {
            $query->where('estado', $estado);
        }

        $ventas = $query->paginate($perPage)->withQueryString();

        $counts = Venta::query()
            ->selectRaw('estado, count(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado');

        return Inertia::render('caja/ventas/index', [
            'ventas' => $ventas,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estado,
            ],
            'stats' => [
                'total' => Venta::count(),
                'pagadas' => (int) ($counts[Venta::ESTADO_PAGADO] ?? 0),
                'anuladas' => (int) ($counts[Venta::ESTADO_ANULADO] ?? 0),
                'coincidencias' => $ventas->total(),
            ],
            'mi_sesion_abierta' => CajaSesion::query()
                ->where('estado', CajaSesion::ESTADO_ABIERTA)
                ->where('opened_by_id', Auth::id())
                ->first(['id', 'sede_id', 'opened_at', 'saldo_apertura']),
        ]);
    }

    public function create(Request $request): Response
    {
        $tenantId = tenant_id();
        abort_if($tenantId === null || $tenantId === '', 403);

        $setting = TallerSetting::current();
        $emiteSunat = (bool) $setting->emite_comprobantes_sunat;
        $igvPct = $setting->igvPorcentajeEfectivo();

        $desdeOrden = null;
        $ordenId = trim((string) $request->query('orden_trabajo_id', ''));
        if ($ordenId !== '') {
            $orden = OrdenTrabajo::query()
                ->with([
                    'lineas' => fn ($q) => $q->orderBy('orden'),
                    'cliente:id,nombres,apellidos',
                    'vehiculo:id,placa',
                ])
                ->findOrFail($ordenId);

            abort_if($orden->estado === OrdenTrabajo::ESTADO_ANULADA, 422, 'La orden está anulada.');

            $lineasOt = $orden->lineas
                ->filter(fn ($linea) => trim((string) $linea->descripcion) !== '')
                ->values()
                ->map(fn ($linea) => [
                    'servicio_id' => $linea->servicio_id,
                    'producto_id' => $linea->producto_id,
                    'concepto' => (string) $linea->descripcion,
                    'cantidad' => (string) $linea->cantidad,
                    'precio_unitario' => (string) $linea->precio_unitario,
                ])
                ->all();

            if ($lineasOt === []) {
                $lineasOt = [[
                    'servicio_id' => null,
                    'producto_id' => null,
                    'concepto' => trim((string) ($orden->solicitud_cliente ?? '')) !== ''
                        ? (string) $orden->solicitud_cliente
                        : 'OT '.$orden->numero,
                    'cantidad' => '1',
                    'precio_unitario' => (string) (max(0, (float) ($orden->saldo ?? $orden->total ?? 0))),
                ]];
            }

            $desdeOrden = [
                'id' => $orden->id,
                'numero' => $orden->numero,
                'cliente_id' => $orden->cliente_id,
                'vehiculo_id' => $orden->vehiculo_id,
                'cliente_nombre' => $orden->cliente?->nombreCompleto(),
                'vehiculo_label' => $orden->vehiculo?->placa,
                'lineas' => $lineasOt,
            ];
        }

        return Inertia::render('caja/ventas/create', [
            'mi_sesion_abierta' => CajaSesion::query()
                ->where('estado', CajaSesion::ESTADO_ABIERTA)
                ->where('opened_by_id', Auth::id())
                ->first(['id', 'sede_id', 'opened_at', 'saldo_apertura']),
            'igv' => [
                'igv_porcentaje' => $igvPct,
                'igv_afectacion' => $setting->igvAfectacion(),
                'precio_incluye_igv' => (bool) $setting->precio_incluye_igv && $igvPct > 0,
                'moneda' => $setting->moneda === 'USD' ? 'USD' : 'PEN',
            ],
            'emite_comprobantes_sunat' => $emiteSunat,
            'fel_ready' => $emiteSunat && ApisunatCredentialResolver::estaConfigurado($setting),
            'desde_orden' => $desdeOrden,
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
            'productos' => Producto::query()
                ->where('activo', true)
                ->orderBy('nombre')
                ->limit(400)
                ->get(['id', 'nombre', 'sku', 'precio_venta', 'unidad']),
            'servicios' => app(ServicioKitService::class)->catalogoActivos(),
        ]);
    }

    public function store(
        StoreVentaDirectaRequest $request,
        VentaCheckoutFromOrdenService $checkout,
        FelEmisionVentaService $fel,
    ): RedirectResponse {
        $data = $request->validated();
        $setting = TallerSetting::current();

        if (! $setting->emite_comprobantes_sunat) {
            $data['tipo_comprobante_sunat'] = 0;
        }

        $ordenId = $data['orden_trabajo_id'] ?? null;
        unset($data['orden_trabajo_id']);

        if (is_string($ordenId) && $ordenId !== '') {
            $orden = OrdenTrabajo::query()->findOrFail($ordenId);
            $venta = $checkout->cobrar($orden, $data, $request->user());
        } else {
            $venta = $checkout->cobrarDirecto($data, $request->user());
        }

        $tipo = (int) ($data['tipo_comprobante_sunat'] ?? 0);

        if ($tipo > 0 && $fel->puedeEmitir($setting, $venta)) {
            try {
                $doc = $fel->emitir($venta);
                Inertia::flash('toast', [
                    'type' => 'success',
                    'message' => 'Venta registrada y comprobante '.$doc->numero_completo.' emitido.',
                ]);
            } catch (ValidationException $e) {
                Inertia::flash('toast', [
                    'type' => 'warning',
                    'message' => 'Venta registrada. SUNAT: '.($e->validator->errors()->first() ?: $e->getMessage()),
                ]);
            }
        } else {
            Inertia::flash('toast', [
                'type' => 'success',
                'message' => 'Venta registrada. Puedes imprimir el ticket.',
            ]);
        }

        return redirect()->route('caja.ventas.show', [
            'venta' => $venta,
            'imprimir' => 1,
        ]);
    }

    public function show(Request $request, Venta $venta): Response
    {
        $tenantId = tenant_id();
        abort_if($tenantId === null || $tenantId === '', 403);

        $venta->load([
            'cliente:id,nombres,apellidos,tipo_documento,numero_documento',
            'vehiculo:id,placa',
            'ordenTrabajo:id,numero',
            'sede:id,nombre',
            'creadoPor:id,name',
            'lineas' => fn ($q) => $q->orderBy('orden'),
            'pagos',
            'felDocument:id,numero_completo,estado',
        ]);

        $setting = TallerSetting::current();
        $clienteNombre = $venta->cliente?->nombreCompleto() ?: 'Sin cliente';
        $esTicketInterno = $venta->tipo_comprobante_sunat === null
            || (int) $venta->tipo_comprobante_sunat === 0;

        return Inertia::render('caja/ventas/show', [
            'venta' => [
                'id' => $venta->id,
                'numero' => $venta->numero,
                'estado' => $venta->estado,
                'moneda' => $venta->moneda === 'USD' ? 'USD' : 'PEN',
                'subtotal' => (string) $venta->subtotal,
                'igv_monto' => (string) $venta->igv_monto,
                'descuento_monto' => (string) $venta->descuento_monto,
                'total' => (string) $venta->total,
                'metodo_pago' => $venta->metodo_pago,
                'monto_recibido' => $venta->monto_recibido !== null ? (string) $venta->monto_recibido : null,
                'vuelto' => $venta->vuelto !== null ? (string) $venta->vuelto : null,
                'fecha_pago' => $venta->fecha_pago?->toIso8601String(),
                'created_at' => $venta->created_at?->toIso8601String(),
                'notas' => $venta->notas,
                'tipo_comprobante_sunat' => $venta->tipo_comprobante_sunat,
                'fel_estado' => $venta->fel_estado,
                'cliente' => $clienteNombre,
                'cliente_doc' => $venta->cliente && filled($venta->cliente->numero_documento)
                    ? strtoupper((string) ($venta->cliente->tipo_documento ?: 'DOC')).' '.$venta->cliente->numero_documento
                    : null,
                'vehiculo' => $venta->vehiculo?->placa,
                'orden_trabajo' => $venta->ordenTrabajo?->numero,
                'sede' => $venta->sede?->nombre ?? '—',
                'cajero' => $venta->creadoPor?->name ?? '—',
                'igv_porcentaje' => number_format($setting->igvPorcentajeEfectivo(), 2, '.', ''),
                'lineas' => $venta->lineas->map(fn ($ln) => [
                    'id' => $ln->id,
                    'descripcion' => $ln->descripcion,
                    'cantidad' => (string) $ln->cantidad,
                    'precio_unitario' => (string) $ln->precio_unitario,
                    'subtotal' => (string) $ln->subtotal,
                ])->values()->all(),
                'pagos' => $venta->pagos->map(fn ($pago) => [
                    'id' => $pago->id,
                    'metodo' => $pago->metodo,
                    'monto' => (string) $pago->monto,
                    'monto_recibido' => $pago->monto_recibido !== null ? (string) $pago->monto_recibido : null,
                    'vuelto' => $pago->vuelto !== null ? (string) $pago->vuelto : null,
                ])->values()->all(),
                'fel_document' => $venta->felDocument === null ? null : [
                    'numero_completo' => $venta->felDocument->numero_completo,
                ],
            ],
            'taller' => [
                'ticket_ancho_mm' => (string) $setting->ticketAnchoMm(),
                'emite_comprobantes_sunat' => (bool) $setting->emite_comprobantes_sunat,
            ],
            'ticket' => [
                'puede_imprimir' => $venta->estado === Venta::ESTADO_PAGADO && $esTicketInterno,
            ],
            'ui' => [
                'auto_imprimir' => $request->boolean('imprimir'),
            ],
        ]);
    }

    public function ticket(Request $request, Venta $venta, VentaTicketViewService $ticketView): View
    {
        $setting = TallerSetting::current();
        $ancho = TicketAnchoMm::fromRequest($request, (string) $setting->ticketAnchoMm());
        $autoPrint = $request->boolean('print');

        return view(
            'caja.venta-ticket',
            $ticketView->viewData($venta, $setting, $ancho, $autoPrint),
        );
    }
}
