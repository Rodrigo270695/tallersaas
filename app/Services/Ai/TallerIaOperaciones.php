<?php

namespace App\Services\Ai;

use App\Models\Cita;
use App\Models\Cliente;
use App\Models\OrdenTrabajo;
use App\Models\Presupuesto;
use App\Models\Producto;
use App\Models\Vehiculo;
use App\Support\WhatsApp\WhatsAppChatId;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class TallerIaOperaciones
{
    public function __construct(private MantenimientoEstimador $estimador) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function pendientes(?CarbonInterface $hoy = null): array
    {
        $hoy ??= now();
        $eventos = $this->eventosPorVehiculo();
        if ($eventos === []) {
            return [];
        }

        $vehiculos = Vehiculo::query()
            ->with(['cliente:id,nombres,apellidos,telefono', 'marca:id,nombre', 'modelo:id,nombre'])
            ->whereIn('id', array_keys($eventos))
            ->get();

        $out = [];
        foreach ($vehiculos as $vehiculo) {
            $km = $vehiculo->kilometraje !== null ? (int) $vehiculo->kilometraje : null;
            foreach (array_keys(MantenimientoEstimador::TIPOS) as $tipo) {
                $alerta = $this->estimador->evaluar($tipo, $eventos[$vehiculo->id][$tipo] ?? [], $km, $hoy);
                if ($alerta === null) {
                    continue;
                }

                $out[] = array_merge($alerta, $this->vehiculoCard($vehiculo));
            }
        }

        usort($out, function (array $a, array $b): int {
            return [(int) $b['atrasado'], $a['dias_restantes']] <=> [(int) $a['atrasado'], $b['dias_restantes']];
        });

        return array_slice($out, 0, 40);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function presupuestosCallados(): array
    {
        return Presupuesto::query()
            ->with([
                'cliente:id,nombres,apellidos,telefono',
                'vehiculo:id,placa,marca_id,modelo_id',
                'vehiculo.marca:id,nombre',
                'vehiculo.modelo:id,nombre',
                'items:id,presupuesto_id,descripcion',
            ])
            ->where('estado', Presupuesto::ESTADO_ENVIADO)
            ->whereNotNull('enviado_at')
            ->where('enviado_at', '<=', now()->subDays(2))
            ->latest('enviado_at')
            ->limit(20)
            ->get()
            ->map(function (Presupuesto $presupuesto): array {
                $cliente = $presupuesto->cliente;

                return [
                    'id' => $presupuesto->id,
                    'numero' => $presupuesto->numero,
                    'cliente_id' => $presupuesto->cliente_id,
                    'cliente' => $this->nombreCliente($cliente),
                    'auto' => $this->autoLabel($presupuesto->vehiculo),
                    'enviado_hace' => $presupuesto->enviado_at?->locale('es')->diffForHumans() ?? '',
                    'items' => $presupuesto->items->pluck('descripcion')->filter()->take(8)->values()->all(),
                    'puede_avisar' => WhatsAppChatId::fromPhone($cliente?->telefono) !== null,
                ];
            })
            ->all();
    }

    /**
     * @return list<array{nombre: string, demanda: string, stock: string, falta: string}>
     */
    public function comprasSemana(): array
    {
        $citas = Cita::query()
            ->whereIn('estado', Cita::ESTADOS_ACTIVAS)
            ->whereBetween('inicia_at', [now()->startOfDay(), now()->addDays(7)->endOfDay()])
            ->whereNotNull('vehiculo_id')
            ->get(['id', 'vehiculo_id']);

        $vehiculoIds = $citas->pluck('vehiculo_id')->unique()->values();
        if ($vehiculoIds->isEmpty()) {
            return [];
        }

        $ordenes = OrdenTrabajo::query()
            ->whereIn('vehiculo_id', $vehiculoIds)
            ->where('estado', '!=', OrdenTrabajo::ESTADO_ANULADA)
            ->with('lineas:id,orden_trabajo_id,tipo,producto_id,descripcion,cantidad')
            ->orderByDesc('ingreso_at')
            ->get()
            ->unique('vehiculo_id');

        $demanda = [];
        foreach ($ordenes as $orden) {
            foreach ($orden->lineas as $linea) {
                if ($linea->producto_id === null) {
                    continue;
                }
                $id = (string) $linea->producto_id;
                $demanda[$id] = ($demanda[$id] ?? 0) + (float) $linea->cantidad;
            }
        }

        if ($demanda === []) {
            return [];
        }

        $productos = Producto::query()
            ->whereIn('id', array_keys($demanda))
            ->withSum('existenciasSede as stock', 'cantidad')
            ->get(['id', 'nombre']);

        $rows = [];
        foreach ($productos as $producto) {
            $pide = $demanda[(string) $producto->id] ?? 0;
            $stock = (float) ($producto->stock ?? 0);
            if ($stock + 0.0001 >= $pide) {
                continue;
            }
            $rows[] = [
                'nombre' => (string) $producto->nombre,
                'demanda' => $this->numero($pide),
                'stock' => $this->numero($stock),
                'falta' => $this->numero($pide - $stock),
            ];
        }

        return $rows;
    }

    /**
     * @return list<array{cliente_id: string, cliente: string, auto: string, telefono: string}>
     */
    public function sinPlumillas(): array
    {
        $conPlumilla = DB::table('orden_trabajo_lineas as l')
            ->join('ordenes_trabajo as o', 'o.id', '=', 'l.orden_trabajo_id')
            ->whereNull('o.deleted_at')
            ->where('o.ingreso_at', '>=', now()->subMonths(24))
            ->where(function ($query): void {
                $query->where('l.descripcion', 'ilike', '%plumilla%')
                    ->orWhere('l.descripcion', 'ilike', '%escobilla%')
                    ->orWhere('l.descripcion', 'ilike', '%limpiaparabrisas%');
            })
            ->distinct()
            ->pluck('o.vehiculo_id');

        return Vehiculo::query()
            ->with(['cliente:id,nombres,apellidos,telefono', 'marca:id,nombre', 'modelo:id,nombre'])
            ->whereNotNull('cliente_id')
            ->when($conPlumilla->isNotEmpty(), fn ($query) => $query->whereNotIn('id', $conPlumilla))
            ->whereExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('ordenes_trabajo')
                    ->whereColumn('ordenes_trabajo.vehiculo_id', 'vehiculos.id')
                    ->whereNull('ordenes_trabajo.deleted_at')
                    ->where('ordenes_trabajo.estado', '!=', OrdenTrabajo::ESTADO_ANULADA);
            })
            ->limit(40)
            ->get()
            ->map(function (Vehiculo $vehiculo): ?array {
                $telefono = WhatsAppChatId::fromPhone($vehiculo->cliente?->telefono);
                if ($telefono === null || $vehiculo->cliente_id === null) {
                    return null;
                }

                return [
                    'cliente_id' => (string) $vehiculo->cliente_id,
                    'cliente' => $this->nombreCliente($vehiculo->cliente),
                    'auto' => trim($this->autoLabel($vehiculo).' '.$vehiculo->placa),
                    'telefono' => $telefono,
                ];
            })
            ->filter()
            ->unique('cliente_id')
            ->values()
            ->all();
    }

    public function mensajeMantenimiento(string $taller, string $nombre, string $auto, string $etiqueta, string $detalle): string
    {
        return "Hola {$nombre}, en {$taller} tu {$auto} está cerca del {$etiqueta}. {$detalle} ¿Te agendamos un hueco?";
    }

    /**
     * @return array<string, array<string, list<array{at: CarbonInterface, km: ?int}>>>
     */
    private function eventosPorVehiculo(): array
    {
        $rows = DB::table('orden_trabajo_lineas as l')
            ->join('ordenes_trabajo as o', 'o.id', '=', 'l.orden_trabajo_id')
            ->whereNull('o.deleted_at')
            ->where('o.estado', '!=', OrdenTrabajo::ESTADO_ANULADA)
            ->whereNotNull('o.vehiculo_id')
            ->orderByDesc('o.ingreso_at')
            ->limit(4000)
            ->get(['o.vehiculo_id', 'o.km_ingreso', 'o.ingreso_at', 'l.descripcion']);

        $eventos = [];
        foreach ($rows as $row) {
            $tipo = MantenimientoEstimador::clasificar((string) $row->descripcion);
            if ($tipo === null || $row->ingreso_at === null) {
                continue;
            }

            $id = (string) $row->vehiculo_id;
            if (count($eventos[$id][$tipo] ?? []) >= 6) {
                continue;
            }

            $eventos[$id][$tipo][] = [
                'at' => Carbon::parse($row->ingreso_at),
                'km' => $row->km_ingreso !== null ? (int) $row->km_ingreso : null,
            ];
        }

        return $eventos;
    }

    /**
     * @return array{vehiculo_id: string, placa: string, auto: string, cliente_id: ?string, cliente: string, puede_avisar: bool}
     */
    private function vehiculoCard(Vehiculo $vehiculo): array
    {
        return [
            'vehiculo_id' => (string) $vehiculo->id,
            'placa' => (string) $vehiculo->placa,
            'auto' => trim($this->autoLabel($vehiculo).' '.$vehiculo->placa),
            'cliente_id' => $vehiculo->cliente_id !== null ? (string) $vehiculo->cliente_id : null,
            'cliente' => $this->nombreCliente($vehiculo->cliente),
            'puede_avisar' => WhatsAppChatId::fromPhone($vehiculo->cliente?->telefono) !== null,
        ];
    }

    private function nombreCliente(?Cliente $cliente): string
    {
        $full = trim((string) ($cliente?->nombres ?? '').' '.(string) ($cliente?->apellidos ?? ''));

        return $full !== '' ? $full : 'cliente';
    }

    private function autoLabel(?Vehiculo $vehiculo): string
    {
        if ($vehiculo === null) {
            return 'tu auto';
        }

        $label = trim(implode(' ', array_filter([
            $vehiculo->marca?->nombre,
            $vehiculo->modelo?->nombre,
        ])));

        return $label !== '' ? $label : 'tu auto';
    }

    private function numero(float $value): string
    {
        $text = number_format($value, 3, '.', '');

        return rtrim(rtrim($text, '0'), '.') ?: '0';
    }
}
