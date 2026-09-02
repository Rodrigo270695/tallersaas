<?php

namespace App\Http\Controllers;

use App\Models\Venta;
use Illuminate\Http\Request;
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
        ]);
    }
}
