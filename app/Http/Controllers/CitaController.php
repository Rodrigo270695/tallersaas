<?php

namespace App\Http\Controllers;

use App\Http\Requests\CitaRequest;
use App\Models\Cita;
use App\Models\Cliente;
use App\Models\Sede;
use App\Models\User;
use App\Models\Vehiculo;
use App\Services\Notifications\CitaWhatsAppNotifier;
use App\Services\Taller\ConvertCitaAOrdenService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CitaController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = [
        'inicia_at',
        'estado',
        'created_at',
    ];

    private const RANGOS = ['hoy', 'proximas', 'todas'];

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
        $direction = strtolower((string) $request->string('direction', 'asc'));
        $sortValid = in_array($sort, self::SORTABLE_COLUMNS, true);
        $directionValid = in_array($direction, ['asc', 'desc'], true);

        $estado = (string) $request->string('estado', 'todas');
        if ($estado !== 'todas' && ! in_array($estado, Cita::ESTADOS, true)) {
            $estado = 'todas';
        }

        $rango = (string) $request->string('rango', 'hoy');
        if (! in_array($rango, self::RANGOS, true)) {
            $rango = 'hoy';
        }

        $tz = (string) config('app.timezone', 'America/Lima');
        $now = now($tz);

        $query = Cita::query()
            ->with([
                'cliente:id,nombres,apellidos',
                'vehiculo:id,placa,marca_id,modelo_id',
                'vehiculo.marca:id,nombre',
                'vehiculo.modelo:id,nombre',
                'sede:id,nombre,codigo',
                'asignadoA:id,name',
                'ordenTrabajo:id,numero,estado',
            ]);

        $this->applyRango($query, $rango, $now);

        if ($estado !== 'todas') {
            $query->where('estado', $estado);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('motivo', 'ILIKE', "%{$search}%")
                    ->orWhereHas('cliente', function ($c) use ($search): void {
                        $c->where('nombres', 'ILIKE', "%{$search}%")
                            ->orWhere('apellidos', 'ILIKE', "%{$search}%");
                    })
                    ->orWhereHas('vehiculo', function ($v) use ($search): void {
                        $v->where('placa', 'ILIKE', "%{$search}%");
                    });
            });
        }

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            if ($sort !== 'inicia_at') {
                $query->orderBy('inicia_at');
            }
        } elseif ($rango === 'todas') {
            $query->orderByDesc('inicia_at');
        } else {
            $query->orderBy('inicia_at');
        }

        $citas = $query->paginate($perPage)->withQueryString();

        $hoyInicio = $now->copy()->startOfDay();
        $hoyFin = $now->copy()->endOfDay();

        return Inertia::render('taller/citas/index', [
            'citas' => $citas,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estado,
                'rango' => $rango,
            ],
            'stats' => [
                'hoy' => Cita::query()
                    ->whereBetween('inicia_at', [$hoyInicio, $hoyFin])
                    ->whereNotIn('estado', [Cita::ESTADO_CANCELADA, Cita::ESTADO_NO_ASISTIO])
                    ->count(),
                'proximas' => Cita::query()
                    ->where('inicia_at', '>=', $now)
                    ->whereIn('estado', Cita::ESTADOS_ACTIVAS)
                    ->count(),
                'convertidas' => Cita::query()->where('estado', Cita::ESTADO_CONVERTIDA)->count(),
                'coincidencias' => $citas->total(),
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
            'mecanicos' => User::query()
                ->where('tenant_id', $tenantId)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function store(CitaRequest $request, CitaWhatsAppNotifier $whatsapp): RedirectResponse
    {
        $data = $request->validated();
        $userId = Auth::id();

        $cita = Cita::query()->create([
            ...$data,
            'estado' => Cita::ESTADO_PROGRAMADA,
            'created_by_id' => $userId,
            'updated_by_id' => $userId,
        ]);

        $this->flashCitaGuardada('Cita creada correctamente.', $whatsapp->enqueue($cita, 'creada'));

        return back();
    }

    public function update(CitaRequest $request, Cita $cita, CitaWhatsAppNotifier $whatsapp): RedirectResponse
    {
        if ($cita->estado === Cita::ESTADO_CONVERTIDA) {
            throw ValidationException::withMessages([
                'estado' => 'La cita ya se convirtió en orden de trabajo y no se puede editar.',
            ]);
        }

        $data = $request->validated();
        $data['updated_by_id'] = Auth::id();
        $inicioAnterior = $cita->inicia_at?->toIso8601String();

        $cita->update($data);

        $evento = ($cita->fresh()?->inicia_at?->toIso8601String() !== $inicioAnterior)
            ? 'reprogramada'
            : 'actualizada';

        $this->flashCitaGuardada(
            'Cita actualizada correctamente.',
            $whatsapp->enqueue($cita->fresh() ?? $cita, $evento),
        );

        return back();
    }

    public function destroy(Cita $cita): RedirectResponse
    {
        $cita->update(['updated_by_id' => Auth::id()]);
        $cita->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cita eliminada correctamente.']);

        return back();
    }

    public function convertir(Cita $cita, ConvertCitaAOrdenService $convert): RedirectResponse
    {
        abort_unless(Auth::user()?->can('ordenes-trabajo.create') ?? false, 403);

        $orden = $convert->convertir($cita);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Cita convertida en {$orden->numero}.",
        ]);

        return back();
    }

    /**
     * @param  Builder<Cita>  $query
     */
    private function applyRango($query, string $rango, Carbon $now): void
    {
        if ($rango === 'hoy') {
            $query->whereBetween('inicia_at', [$now->copy()->startOfDay(), $now->copy()->endOfDay()]);

            return;
        }

        if ($rango === 'proximas') {
            $query->where('inicia_at', '>=', $now)
                ->whereIn('estado', Cita::ESTADOS_ACTIVAS);
        }
    }

    /**
     * @param  array{type: 'warning'|'info'|'success', message: string}|null  $whatsapp
     */
    private function flashCitaGuardada(string $base, ?array $whatsapp): void
    {
        if ($whatsapp === null) {
            Inertia::flash('toast', ['type' => 'success', 'message' => $base]);

            return;
        }

        if ($whatsapp['type'] === 'warning') {
            Inertia::flash('toast', [
                'type' => 'warning',
                'message' => $base.' '.$whatsapp['message'],
            ]);

            return;
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $base.' '.$whatsapp['message'],
        ]);
    }
}
