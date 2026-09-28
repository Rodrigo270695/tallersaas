<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Presupuesto;
use App\Services\Ai\OpenAiException;
use App\Services\Ai\TallerIaOperaciones;
use App\Services\Ai\TallerIaService;
use App\Services\Notifications\CitaWhatsAppMessage;
use App\Services\Notifications\NotificationQueueService;
use App\Support\WhatsApp\WhatsAppChatId;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TallerIaCentroController extends Controller
{
    public function index(TallerIaOperaciones $operaciones): Response
    {
        abort_if(tenant_id() === null || tenant_id() === '', 403);

        $campana = $operaciones->sinPlumillas();

        return Inertia::render('taller/ia/index', [
            'pendientes' => $operaciones->pendientes(),
            'callados' => $operaciones->presupuestosCallados(),
            'compras' => $operaciones->comprasSemana(),
            'campana' => [
                'total' => count($campana),
                'muestra' => array_slice($campana, 0, 8),
            ],
        ]);
    }

    public function avisar(Request $request, TallerIaOperaciones $operaciones, NotificationQueueService $queue, CitaWhatsAppMessage $messages): RedirectResponse
    {
        abort_if(tenant_id() === null || tenant_id() === '', 403);

        $data = $request->validate([
            'vehiculo_id' => ['required', 'uuid'],
            'tipo' => ['required', 'string', 'max:20'],
        ]);

        $alerta = collect($operaciones->pendientes())->first(
            fn (array $row): bool => $row['vehiculo_id'] === $data['vehiculo_id'] && $row['tipo'] === $data['tipo'],
        );

        if (! is_array($alerta) || $alerta['cliente_id'] === null) {
            return back()->withErrors(['ia' => 'Ese auto ya no está en la lista.']);
        }

        $this->encolar(
            $queue,
            (string) $alerta['cliente_id'],
            $operaciones->mensajeMantenimiento(
                $messages->tallerDisplayName(),
                (string) $alerta['cliente'],
                (string) $alerta['auto'],
                (string) $alerta['etiqueta'],
                (string) $alerta['detalle'],
            ),
            'mantenimiento',
            (string) $alerta['vehiculo_id'],
            'mant:'.$alerta['vehiculo_id'].':'.$alerta['tipo'].':'.now()->format('Y-m'),
        );

        return back();
    }

    public function seguimiento(Request $request, TallerIaService $ia): JsonResponse
    {
        abort_if(tenant_id() === null || tenant_id() === '', 403);

        $data = $request->validate(['presupuesto_id' => ['required', 'uuid']]);
        $presupuesto = Presupuesto::query()
            ->with([
                'cliente:id,nombres,apellidos',
                'vehiculo:id,placa',
                'items:id,presupuesto_id,descripcion',
            ])
            ->findOrFail($data['presupuesto_id']);

        $cliente = trim((string) ($presupuesto->cliente?->nombres ?? '').' '.(string) ($presupuesto->cliente?->apellidos ?? ''));

        try {
            $mensaje = $ia->seguimientoPresupuesto(
                $cliente !== '' ? $cliente : 'cliente',
                (string) ($presupuesto->vehiculo?->placa ?: 'el auto'),
                $presupuesto->items->pluck('descripcion')->filter()->take(8)->values()->all(),
            );
        } catch (OpenAiException $exception) {
            return response()->json(['message' => $exception->getMessage()], $exception->httpStatus);
        }

        return response()->json(['mensaje' => $mensaje]);
    }

    public function comprasResumen(TallerIaOperaciones $operaciones, TallerIaService $ia): JsonResponse
    {
        abort_if(tenant_id() === null || tenant_id() === '', 403);

        try {
            $mensaje = $ia->resumenCompras($operaciones->comprasSemana());
        } catch (OpenAiException $exception) {
            return response()->json(['message' => $exception->getMessage()], $exception->httpStatus);
        }

        return response()->json(['mensaje' => $mensaje]);
    }

    public function campana(TallerIaOperaciones $operaciones, TallerIaService $ia, CitaWhatsAppMessage $messages): JsonResponse
    {
        abort_if(tenant_id() === null || tenant_id() === '', 403);

        $total = count($operaciones->sinPlumillas());
        if ($total === 0) {
            return response()->json(['message' => 'No hay autos para esa campaña.'], 422);
        }

        try {
            $mensaje = $ia->campanaPlumillas($messages->tallerDisplayName(), $total);
        } catch (OpenAiException $exception) {
            return response()->json(['message' => $exception->getMessage()], $exception->httpStatus);
        }

        return response()->json(['mensaje' => $mensaje, 'total' => $total]);
    }

    public function campanaEnviar(Request $request, TallerIaOperaciones $operaciones, NotificationQueueService $queue): RedirectResponse
    {
        abort_if(tenant_id() === null || tenant_id() === '', 403);

        $data = $request->validate(['mensaje' => ['required', 'string', 'max:800']]);
        $enviados = 0;

        foreach ($operaciones->sinPlumillas() as $persona) {
            $cuerpo = str_replace('{nombre}', (string) $persona['cliente'], $data['mensaje']);
            $created = $queue->enqueue(
                tipo: 'campana_plumillas',
                destinatario: (string) $persona['telefono'],
                cuerpo: $cuerpo,
                enviarAt: now(),
                destinatarioNombre: (string) $persona['cliente'],
                referenciaTipo: 'cliente',
                referenciaId: (string) $persona['cliente_id'],
                dedupeKey: 'campana-plumillas:'.$persona['cliente_id'].':'.now()->format('Y-m'),
            );
            if ($created !== null) {
                $enviados++;
            }
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $enviados === 0
                ? 'Esos avisos ya estaban en la cola de este mes.'
                : "Se encolaron {$enviados} WhatsApp.",
        ]);

        return back();
    }

    public function enviar(Request $request, NotificationQueueService $queue, CitaWhatsAppMessage $messages): RedirectResponse
    {
        abort_if(tenant_id() === null || tenant_id() === '', 403);

        $data = $request->validate([
            'cliente_id' => ['required', 'uuid'],
            'cuerpo' => ['required', 'string', 'max:800'],
            'tipo' => ['required', 'string', 'max:40'],
            'referencia_id' => ['nullable', 'uuid'],
            'dedupe_key' => ['required', 'string', 'max:120'],
        ]);

        $this->encolar(
            $queue,
            $data['cliente_id'],
            $data['cuerpo'],
            $data['tipo'],
            $data['referencia_id'] ?? $data['cliente_id'],
            $data['dedupe_key'],
        );

        return back();
    }

    private function encolar(
        NotificationQueueService $queue,
        string $clienteId,
        string $cuerpo,
        string $tipo,
        string $referenciaId,
        string $dedupeKey,
    ): void {
        $cliente = Cliente::query()->find($clienteId, ['id', 'nombres', 'apellidos', 'telefono']);
        $chatId = WhatsAppChatId::fromPhone($cliente?->telefono);
        if ($chatId === null) {
            Inertia::flash('toast', ['type' => 'warning', 'message' => 'Ese cliente no tiene un WhatsApp válido.']);

            return;
        }

        $created = $queue->enqueue(
            tipo: $tipo,
            destinatario: $chatId,
            cuerpo: $cuerpo,
            enviarAt: now(),
            destinatarioNombre: trim((string) ($cliente->nombres ?? '').' '.(string) ($cliente->apellidos ?? '')),
            referenciaTipo: 'cliente',
            referenciaId: $referenciaId,
            dedupeKey: $dedupeKey,
        );

        Inertia::flash('toast', [
            'type' => $created === null ? 'info' : 'success',
            'message' => $created === null
                ? 'Ese aviso ya estaba en la cola.'
                : 'WhatsApp encolado. Sale por Comunicaciones.',
        ]);
    }
}
