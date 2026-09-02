<?php

namespace App\Http\Controllers;

use App\Models\FelDocument;
use App\Models\FelSerie;
use App\Models\TallerSetting;
use App\Models\Venta;
use App\Services\Fel\FelEmisionVentaService;
use App\Support\Fel\ApisunatCredentialResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class FelDocumentController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    public function index(Request $request): Response
    {
        $tenantId = tenant_id();
        abort_if($tenantId === null || $tenantId === '', 403);

        $search = trim((string) $request->string('search', ''));
        $perPageRequested = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPageRequested, self::PER_PAGE_OPTIONS, true) ? $perPageRequested : 10;
        $estado = (string) $request->string('estado', 'todas');
        if ($estado !== 'todas' && ! in_array($estado, [
            FelDocument::ESTADO_EMITIDO,
            FelDocument::ESTADO_PENDIENTE,
            FelDocument::ESTADO_RECHAZADO,
        ], true)) {
            $estado = 'todas';
        }

        $query = FelDocument::query()
            ->with([
                'venta:id,numero,sede_id,cliente_id,fel_estado,tipo_comprobante_sunat',
                'venta.cliente:id,nombres,apellidos',
            ]);

        if ($estado !== 'todas') {
            $query->where('estado', $estado);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('numero_completo', 'ILIKE', "%{$search}%")
                    ->orWhere('receptor_nombre', 'ILIKE', "%{$search}%")
                    ->orWhere('receptor_num_doc', 'ILIKE', "%{$search}%");
            });
        }

        $documentos = $query->orderByDesc('created_at')->paginate($perPage)->withQueryString();
        $documentos = $documentos->through(fn (FelDocument $doc) => $this->presentDocumento($doc));

        $counts = FelDocument::query()
            ->selectRaw('estado, count(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado');

        $setting = TallerSetting::current();

        return Inertia::render('facturacion/documentos/index', [
            'documentos' => $documentos,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'estado' => $estado,
            ],
            'stats' => [
                'total' => FelDocument::query()->count(),
                'emitidos' => (int) ($counts[FelDocument::ESTADO_EMITIDO] ?? 0),
                'rechazados' => (int) ($counts[FelDocument::ESTADO_RECHAZADO] ?? 0),
                'coincidencias' => $documentos->total(),
            ],
            'fel_ready' => (bool) $setting->emite_comprobantes_sunat
                && ApisunatCredentialResolver::estaConfigurado($setting),
        ]);
    }

    public function emitir(Venta $venta, FelEmisionVentaService $fel): RedirectResponse
    {
        try {
            $doc = $fel->emitir($venta);
            Inertia::flash('toast', [
                'type' => 'success',
                'message' => 'Comprobante '.$doc->numero_completo.' emitido correctamente.',
            ]);
        } catch (ValidationException $e) {
            Inertia::flash('toast', [
                'type' => 'warning',
                'message' => $e->validator->errors()->first() ?: 'No se pudo emitir el comprobante.',
            ]);
        }

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function presentDocumento(FelDocument $doc): array
    {
        $cliente = $doc->venta?->cliente;

        return [
            'id' => $doc->id,
            'venta_id' => $doc->venta_id,
            'tipo_comprobante' => $doc->tipo_comprobante,
            'tipo_label' => FelSerie::labelTipo((int) $doc->tipo_comprobante),
            'serie' => $doc->serie,
            'correlativo' => $doc->correlativo,
            'numero_completo' => $doc->numero_completo,
            'receptor_nombre' => $doc->receptor_nombre,
            'receptor_num_doc' => $doc->receptor_num_doc,
            'total' => $doc->total,
            'moneda' => $doc->moneda,
            'estado' => $doc->estado,
            'url_pdf' => $doc->url_pdf,
            'url_xml' => $doc->url_xml,
            'url_cdr' => $doc->url_cdr,
            'error_mensaje' => $doc->error_mensaje,
            'apisunat_mode' => $doc->apisunat_mode,
            'emitido_at' => $doc->emitido_at?->toIso8601String(),
            'venta' => $doc->venta === null ? null : [
                'id' => $doc->venta->id,
                'numero' => $doc->venta->numero,
                'fel_estado' => $doc->venta->fel_estado,
                'cliente' => $cliente === null ? null : [
                    'id' => $cliente->id,
                    'nombres' => $cliente->nombres,
                    'apellidos' => $cliente->apellidos,
                ],
            ],
        ];
    }
}
