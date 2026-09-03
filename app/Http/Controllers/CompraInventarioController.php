<?php

namespace App\Http\Controllers;

use App\Http\Requests\CompraInventarioStoreRequest;
use App\Models\Compra;
use App\Models\CompraLinea;
use App\Models\MovimientoInventario;
use App\Models\Producto;
use App\Models\Proveedor;
use App\Models\Sede;
use App\Models\UnidadMedida;
use App\Services\Inventario\InventarioStockService;
use App\Tenancy\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CompraInventarioController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = ['fecha_documento', 'numero_documento', 'total', 'created_at'];

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

        $estado = (string) $request->string('estado', 'activa');
        if (! in_array($estado, ['activa', 'anulada'], true)) {
            $estado = 'activa';
        }

        $sedesActivas = Sede::query()
            ->where('tenant_id', $tenantId)
            ->where('activa', true)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'codigo']);

        $sedeIds = $sedesActivas->pluck('id')->all();
        $sedeRequested = (string) $request->string('sede_id', '');
        $sedeFiltro = in_array($sedeRequested, $sedeIds, true) ? $sedeRequested : '';

        $proveedorRequested = (string) $request->string('proveedor_id', '');
        $proveedorFiltro = preg_match('/^[0-9a-f-]{36}$/i', $proveedorRequested) === 1 ? $proveedorRequested : '';

        $query = Compra::query()->with(['proveedor:id,ruc,razon_social', 'creadoPor:id,name'])->withCount('lineas');

        $query = $estado === 'anulada' ? $query->onlyTrashed() : $query->whereNull('deleted_at');

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'desc');
            $query->orderByDesc('created_at');
        } else {
            $query->orderByDesc('fecha_documento');
            $query->orderByDesc('created_at');
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('numero_documento', 'ILIKE', "%{$search}%")
                    ->orWhere('serie', 'ILIKE', "%{$search}%")
                    ->orWhere('notas', 'ILIKE', "%{$search}%")
                    ->orWhereHas('proveedor', function ($p) use ($search): void {
                        $p->where('razon_social', 'ILIKE', "%{$search}%")
                            ->orWhere('ruc', 'ILIKE', "%{$search}%");
                    });
            });
        }

        if ($sedeFiltro !== '') {
            $query->where('sede_id', $sedeFiltro);
        }

        if ($proveedorFiltro !== '') {
            $query->where('proveedor_id', $proveedorFiltro);
        }

        $compras = $query->paginate($perPage)->withQueryString();

        $sedeNombres = $sedesActivas->pluck('nombre', 'id');
        $compras->getCollection()->transform(function (Compra $c) use ($sedeNombres): Compra {
            $c->setAttribute('sede_nombre', $sedeNombres[$c->sede_id] ?? '—');

            return $c;
        });

        return Inertia::render('inventario/compras/index', [
            'compras' => $compras,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estado,
                'sede_id' => $sedeFiltro,
                'proveedor_id' => $proveedorFiltro,
            ],
            'stats' => [
                'total' => Compra::count(),
                'coincidencias' => $compras->total(),
            ],
            'sede_options' => $sedesActivas,
            'proveedor_options' => Proveedor::query()
                ->whereNull('deleted_at')
                ->orderBy('razon_social')
                ->get(['id', 'ruc', 'razon_social']),
            'producto_options' => Producto::query()
                ->whereNull('deleted_at')
                ->orderBy('nombre')
                ->limit(400)
                ->get(['id', 'nombre', 'sku', 'unidad']),
            'unidad_options' => UnidadMedida::opcionesParaFormulario(),
        ]);
    }

    public function store(
        CompraInventarioStoreRequest $request,
        InventarioStockService $stock,
        TenantManager $tenants,
    ): RedirectResponse {
        $data = $request->validated();
        $userId = Auth::id() !== null ? (string) Auth::id() : null;

        $compra = DB::transaction(function () use ($data, $userId, $stock): Compra {
            $compra = Compra::create([
                'proveedor_id' => $data['proveedor_id'] ?? null,
                'sede_id' => $data['sede_id'],
                'tipo_comprobante' => $data['tipo_comprobante'],
                'serie' => $data['serie'] ?? null,
                'numero_documento' => $data['numero_documento'] ?? null,
                'fecha_documento' => $data['fecha_documento'],
                'moneda' => 'PEN',
                'notas' => $data['notas'] ?? null,
                'created_by_id' => $userId,
                'updated_by_id' => $userId,
            ]);

            $refDoc = trim(implode('-', array_filter([$data['serie'] ?? null, $data['numero_documento'] ?? null])));
            if ($refDoc === '') {
                $refDoc = 'ref.'.Str::lower(Str::substr((string) $compra->id, 0, 8));
            }

            $total = 0.0;

            foreach ($data['lineas'] as $i => $linea) {
                $productoId = $linea['producto_id'] ?? null;
                $costoUnitario = $linea['costo_unitario'] ?? null;

                if ($productoId === null) {
                    $nuevo = $linea['nuevo_producto'];
                    $producto = Producto::create([
                        'nombre' => $nuevo['nombre'],
                        'slug' => Producto::uniqueSlugFrom($nuevo['nombre']),
                        'unidad' => $nuevo['unidad'] ?? 'UN',
                        'precio_compra' => $costoUnitario,
                        'activo' => true,
                        'created_by_id' => $userId,
                        'updated_by_id' => $userId,
                    ]);
                    $productoId = (string) $producto->id;
                } elseif ($costoUnitario !== null) {
                    Producto::whereKey($productoId)->update([
                        'precio_compra' => $costoUnitario,
                        'updated_by_id' => $userId,
                    ]);
                }

                CompraLinea::create([
                    'compra_id' => $compra->id,
                    'producto_id' => $productoId,
                    'cantidad' => $linea['cantidad'],
                    'costo_unitario' => $costoUnitario,
                    'orden' => (int) $i,
                ]);

                if ($costoUnitario !== null) {
                    $total += (float) $costoUnitario * (float) $linea['cantidad'];
                }

                $stock->registrarEntrada(
                    $productoId,
                    $data['sede_id'],
                    (string) $linea['cantidad'],
                    'Compra '.$refDoc,
                    $userId,
                    (string) $compra->id,
                );
            }

            if ($total > 0) {
                $compra->update(['total' => round($total, 2)]);
            }

            return $compra;
        });

        $this->applyFactura($compra, $request, $tenants);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Compra registrada y stock actualizado.']);

        return back();
    }

    public function destroy(Request $request, Compra $compra): RedirectResponse
    {
        abort_unless($request->user()?->can('compras.delete'), 403);

        try {
            DB::transaction(function () use ($compra, $request): void {
                $c = Compra::query()
                    ->whereKey($compra->id)
                    ->whereNull('deleted_at')
                    ->lockForUpdate()
                    ->first();

                if ($c === null) {
                    throw ValidationException::withMessages([
                        'compra' => 'Esta compra ya fue anulada o no existe.',
                    ]);
                }

                $refDoc = trim(implode('-', array_filter([(string) ($c->serie ?? ''), (string) ($c->numero_documento ?? '')])));
                if ($refDoc === '') {
                    $refDoc = 'ref.'.Str::lower(Str::substr((string) $c->id, 0, 8));
                }

                $userId = $request->user()?->id;
                $userIdStr = $userId !== null ? (string) $userId : null;

                $porProducto = MovimientoInventario::query()
                    ->where('compra_id', (string) $c->id)
                    ->where('tipo', MovimientoInventario::TIPO_ENTRADA)
                    ->selectRaw('producto_id, sede_id, sum(delta) as total_entrada')
                    ->groupBy('producto_id', 'sede_id')
                    ->get();

                foreach ($porProducto as $row) {
                    $qty = (float) (string) $row->total_entrada;
                    if ($qty <= 0) {
                        continue;
                    }

                    MovimientoInventario::aplicar(
                        (string) $row->producto_id,
                        (string) $row->sede_id,
                        MovimientoInventario::TIPO_SALIDA,
                        (string) (-1 * $qty),
                        'Anulación compra '.$refDoc.' (reversión de stock)',
                        $userIdStr,
                        null,
                        (string) $c->id,
                    );
                }

                $c->update(['updated_by_id' => $userIdStr]);
                $c->delete();
            });
        } catch (ValidationException $e) {
            $msg = (string) (collect($e->errors())->flatten()->first() ?? $e->getMessage());

            Inertia::flash('toast', ['type' => 'error', 'message' => $msg]);

            return back();
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Compra anulada: se registró una salida de inventario por la misma cantidad que entró.',
        ]);

        return back();
    }

    private function applyFactura(Compra $compra, CompraInventarioStoreRequest $request, TenantManager $tenants): void
    {
        if (! $request->hasFile('factura')) {
            return;
        }

        $slug = $tenants->slug() ?? 'shared';
        $file = $request->file('factura');
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'pdf');
        $filename = Str::uuid()->toString().'.'.$extension;
        $dir = "tenants/{$slug}/compras";

        Storage::disk('public')->putFileAs($dir, $file, $filename, 'public');

        $compra->update([
            'factura_path' => "{$dir}/{$filename}",
            'factura_original_name' => $file->getClientOriginalName(),
        ]);
    }
}
