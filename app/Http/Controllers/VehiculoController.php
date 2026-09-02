<?php

namespace App\Http\Controllers;

use App\Http\Requests\VehiculoRequest;
use App\Models\Cliente;
use App\Models\Marca;
use App\Models\Modelo;
use App\Models\Vehiculo;
use App\Tenancy\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class VehiculoController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = ['placa', 'anio', 'created_at'];

    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search', ''));
        $perPageRequested = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPageRequested, self::PER_PAGE_OPTIONS, true)
            ? $perPageRequested
            : 10;

        $sort = (string) $request->string('sort', '');
        $direction = strtolower((string) $request->string('direction', 'desc'));
        $sortValid = in_array($sort, self::SORTABLE_COLUMNS, true);
        $directionValid = in_array($direction, ['asc', 'desc'], true);

        $query = Vehiculo::query()->with([
            'cliente:id,nombres,apellidos',
            'marca:id,nombre',
            'modelo:id,nombre',
        ]);

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            $query->orderByDesc('created_at');
        } else {
            $query->orderByDesc('created_at');
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('placa', 'ILIKE', "%{$search}%")
                    ->orWhere('vin', 'ILIKE', "%{$search}%")
                    ->orWhereHas('marca', function ($m) use ($search) {
                        $m->where('nombre', 'ILIKE', "%{$search}%");
                    })
                    ->orWhereHas('modelo', function ($m) use ($search) {
                        $m->where('nombre', 'ILIKE', "%{$search}%");
                    })
                    ->orWhereHas('cliente', function ($c) use ($search) {
                        $c->where('nombres', 'ILIKE', "%{$search}%")
                            ->orWhere('apellidos', 'ILIKE', "%{$search}%");
                    });
            });
        }

        $vehiculos = $query->paginate($perPage)->withQueryString();

        return Inertia::render('taller/vehiculos/index', [
            'vehiculos' => $vehiculos,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
            ],
            'stats' => [
                'total' => Vehiculo::count(),
                'coincidencias' => $vehiculos->total(),
            ],
            'clientes' => Cliente::query()
                ->orderBy('nombres')
                ->get(['id', 'nombres', 'apellidos'])
                ->map(fn (Cliente $cliente) => [
                    'id' => $cliente->id,
                    'nombre' => $cliente->nombreCompleto(),
                ]),
            'marcas' => Marca::query()
                ->orderBy('nombre')
                ->get(['id', 'nombre']),
            'modelos' => Modelo::query()
                ->orderBy('nombre')
                ->get(['id', 'marca_id', 'nombre']),
        ]);
    }

    public function store(VehiculoRequest $request, TenantManager $tenants): RedirectResponse
    {
        $data = collect($request->validated())->except(['foto', 'clear_foto'])->all();
        $vehiculo = Vehiculo::create($data);
        $this->applyFoto($vehiculo, $request, $tenants);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Vehículo creado correctamente.']);

        return back();
    }

    public function update(VehiculoRequest $request, Vehiculo $vehiculo, TenantManager $tenants): RedirectResponse
    {
        $data = collect($request->validated())->except(['foto', 'clear_foto'])->all();
        $vehiculo->update($data);
        $this->applyFoto($vehiculo, $request, $tenants);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Vehículo actualizado correctamente.']);

        return back();
    }

    public function destroy(Vehiculo $vehiculo): RedirectResponse
    {
        $this->deleteFotoFile($vehiculo);
        $vehiculo->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Vehículo eliminado correctamente.']);

        return back();
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => ['uuid'],
        ]);

        $vehiculos = Vehiculo::query()->whereIn('id', $data['ids'])->get();

        foreach ($vehiculos as $vehiculo) {
            $this->deleteFotoFile($vehiculo);
            $vehiculo->delete();
        }

        $count = $vehiculos->count();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $count === 1
                ? '1 vehículo eliminado correctamente.'
                : "{$count} vehículos eliminados correctamente.",
        ]);

        return back();
    }

    private function applyFoto(Vehiculo $vehiculo, VehiculoRequest $request, TenantManager $tenants): void
    {
        $disk = Storage::disk('public');

        if (($request->validated('clear_foto') ?? false) === true) {
            $this->deleteFotoFile($vehiculo);
            $vehiculo->foto_path = null;
            $vehiculo->save();

            return;
        }

        if (! $request->hasFile('foto')) {
            return;
        }

        $slug = $tenants->slug() ?? 'shared';
        $previous = $vehiculo->foto_path;
        $file = $request->file('foto');
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'jpg');
        $filename = Str::uuid()->toString().'.'.$extension;
        $dir = "tenants/{$slug}/vehiculos";

        $disk->putFileAs($dir, $file, $filename, 'public');

        $path = "{$dir}/{$filename}";
        $vehiculo->foto_path = $path;
        $vehiculo->save();

        if ($previous && $previous !== $path && $disk->exists($previous)) {
            $disk->delete($previous);
        }
    }

    private function deleteFotoFile(Vehiculo $vehiculo): void
    {
        if (! $vehiculo->foto_path) {
            return;
        }

        $disk = Storage::disk('public');

        if ($disk->exists($vehiculo->foto_path)) {
            $disk->delete($vehiculo->foto_path);
        }
    }
}
