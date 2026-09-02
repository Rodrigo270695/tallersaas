<?php

namespace App\Http\Controllers;

use App\Http\Requests\CloseCajaSesionRequest;
use App\Http\Requests\StoreCajaSesionRequest;
use App\Models\CajaEgreso;
use App\Models\CajaSesion;
use App\Models\Sede;
use App\Services\Caja\CajaSesionArqueoService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CajaSesionController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = [
        'opened_at',
        'closed_at',
        'estado',
        'saldo_apertura',
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

        $estadoFiltro = (string) $request->string('estado', 'todas');
        if (! in_array($estadoFiltro, ['todas', CajaSesion::ESTADO_ABIERTA, CajaSesion::ESTADO_CERRADA], true)) {
            $estadoFiltro = 'todas';
        }

        $sedesActivas = Sede::query()
            ->where('tenant_id', $tenantId)
            ->where('activa', true)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'codigo']);

        $sedeRequested = (string) $request->string('sede_id', '');
        $sedeFiltro = $sedesActivas->contains(fn (Sede $sede) => (string) $sede->id === $sedeRequested)
            ? $sedeRequested
            : '';

        $query = CajaSesion::query()->with(['abiertaPor:id,name', 'cerradaPor:id,name']);

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('notas', 'ILIKE', "%{$search}%");
            });
        }

        if ($estadoFiltro !== 'todas') {
            $query->where('estado', $estadoFiltro);
        }

        if ($sedeFiltro !== '') {
            $query->where('sede_id', $sedeFiltro);
        }

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'desc');
            if ($sort !== 'opened_at') {
                $query->orderByDesc('opened_at');
            }
        } else {
            $query->orderByDesc('opened_at');
        }

        $sesiones = $query->paginate($perPage)->withQueryString();

        $sedeNombres = Sede::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('id', $sesiones->pluck('sede_id')->unique()->filter()->all())
            ->pluck('nombre', 'id');

        $sesiones->getCollection()->transform(function (CajaSesion $sesion) use ($sedeNombres): CajaSesion {
            $sesion->setAttribute('sede_nombre', $sedeNombres[$sesion->sede_id] ?? '—');

            return $sesion;
        });

        $statsBase = CajaSesion::query()
            ->when($sedeFiltro !== '', fn ($q) => $q->where('sede_id', $sedeFiltro));

        $miSesionAbierta = CajaSesion::query()
            ->where('estado', CajaSesion::ESTADO_ABIERTA)
            ->where('opened_by_id', Auth::id())
            ->with(['abiertaPor:id,name'])
            ->first();

        if ($miSesionAbierta !== null) {
            $miSesionAbierta->setAttribute(
                'sede_nombre',
                Sede::query()->whereKey($miSesionAbierta->sede_id)->value('nombre') ?? '—',
            );
            $this->attachEgresos($miSesionAbierta);
        }

        return Inertia::render('caja/sesiones/index', [
            'sesiones' => $sesiones,
            'sedes_opciones' => $sedesActivas,
            'mi_sesion_abierta' => $miSesionAbierta,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estadoFiltro,
                'sede_id' => $sedeFiltro,
            ],
            'stats' => [
                'total' => (clone $statsBase)->count(),
                'abiertas' => (clone $statsBase)->where('estado', CajaSesion::ESTADO_ABIERTA)->count(),
                'cerradas' => (clone $statsBase)->where('estado', CajaSesion::ESTADO_CERRADA)->count(),
                'coincidencias' => $sesiones->total(),
            ],
            'sin_sedes' => $sedesActivas->isEmpty(),
        ]);
    }

    public function store(StoreCajaSesionRequest $request): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($data): void {
            $usuarioTieneAbierta = CajaSesion::query()
                ->where('estado', CajaSesion::ESTADO_ABIERTA)
                ->where('opened_by_id', Auth::id())
                ->lockForUpdate()
                ->exists();

            if ($usuarioTieneAbierta) {
                throw ValidationException::withMessages([
                    'sede_id' => 'Ya tienes una caja abierta. Ciérrala antes de abrir otra.',
                ]);
            }

            $exists = CajaSesion::query()
                ->where('sede_id', $data['sede_id'])
                ->where('estado', CajaSesion::ESTADO_ABIERTA)
                ->lockForUpdate()
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'sede_id' => 'Esta sede ya tiene una caja abierta.',
                ]);
            }

            CajaSesion::query()->create([
                'sede_id' => $data['sede_id'],
                'estado' => CajaSesion::ESTADO_ABIERTA,
                'moneda' => $data['moneda'],
                'saldo_apertura' => $data['saldo_apertura'],
                'opened_at' => now(),
                'notas' => $data['notas'] ?? null,
                'opened_by_id' => Auth::id(),
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Caja abierta correctamente.']);

        return back();
    }

    public function cerrar(
        CloseCajaSesionRequest $request,
        CajaSesion $caja_sesion,
        CajaSesionArqueoService $arqueoService,
    ): RedirectResponse {
        if (! $caja_sesion->estaAbierta()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Esta sesión ya está cerrada.']);

            return back();
        }

        if ((string) $caja_sesion->opened_by_id !== (string) Auth::id()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Solo quien abrió la caja puede cerrarla.']);

            return back();
        }

        $data = $request->validated();
        $arqueo = $arqueoService->build($caja_sesion, (string) $data['saldo_cierre_efectivo']);

        $caja_sesion->update([
            'estado' => CajaSesion::ESTADO_CERRADA,
            'saldo_cierre_efectivo' => $data['saldo_cierre_efectivo'],
            'arqueo_json' => $arqueo,
            'closed_at' => now(),
            'closed_by_id' => Auth::id(),
            'notas' => $this->mergeNotasCierre($caja_sesion->notas, $data['notas'] ?? null),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Caja cerrada correctamente.']);

        return back();
    }

    private function attachEgresos(CajaSesion $sesion): void
    {
        $egresos = $sesion->egresos()
            ->with('creadoPor:id,name')
            ->orderByDesc('created_at')
            ->get();

        $sesion->setAttribute(
            'egresos',
            $egresos->map(fn (CajaEgreso $egreso): array => [
                'id' => $egreso->id,
                'monto' => $egreso->monto,
                'motivo' => $egreso->motivo,
                'motivo_label' => CajaEgreso::labelMotivo((string) $egreso->motivo),
                'descripcion' => $egreso->descripcion,
                'created_at' => $egreso->created_at?->toIso8601String(),
                'creado_por' => $egreso->creadoPor !== null
                    ? ['id' => $egreso->creadoPor->id, 'name' => $egreso->creadoPor->name]
                    : null,
            ])->values()->all(),
        );
        $sesion->setAttribute(
            'egresos_total',
            number_format((float) $egresos->sum('monto'), 2, '.', ''),
        );
    }

    private function mergeNotasCierre(?string $existentes, ?string $nuevas): ?string
    {
        $nuevas = $nuevas !== null ? trim($nuevas) : '';
        if ($nuevas === '') {
            return $existentes;
        }

        $existentes = $existentes !== null ? trim($existentes) : '';
        if ($existentes === '') {
            return $nuevas;
        }

        return $existentes."\n\n--- Cierre ---\n".$nuevas;
    }
}
