<?php

namespace App\Http\Controllers;

use App\Models\NotificationQueue;
use App\Models\TenantWhatsAppSession;
use App\Services\Notifications\NotificationQueueService;
use App\Services\Notifications\WhatsAppNotificationDispatcher;
use App\Services\OpenWa\OpenWaClient;
use App\Services\OpenWa\TenantWhatsAppSessionSync;
use App\Support\OpenWa\TenantWhatsAppPresenter;
use App\Support\WhatsApp\WhatsAppChatId;
use App\Tenancy\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TenantWhatsAppController extends Controller
{
    public function sync(
        Request $request,
        TenantManager $tenants,
        TenantWhatsAppSessionSync $sync,
        TenantWhatsAppPresenter $presenter,
    ): RedirectResponse|JsonResponse {
        $tenant = $tenants->current()?->tenant;
        abort_if($tenant === null, 404);

        $session = $sync->ensureForTenant($tenant);

        if ($request->expectsJson()) {
            return response()->json([
                'whatsapp' => $presenter->forTenant($tenant),
            ]);
        }

        if ($session?->isReady()) {
            Inertia::flash('toast', ['type' => 'success', 'message' => 'WhatsApp conectado y listo para enviar.']);

            return back();
        }

        Inertia::flash('toast', [
            'type' => 'info',
            'message' => 'Sesión sincronizada. Escanea el código QR para vincular el número del taller.',
        ]);

        return back();
    }

    public function qr(
        TenantManager $tenants,
        OpenWaClient $client,
        TenantWhatsAppSessionSync $sync,
    ): JsonResponse {
        abort_unless($client->isConfigured(), 503, 'OpenWA no está configurado en el servidor.');

        $tenant = $tenants->current()?->tenant;
        abort_if($tenant === null, 404);

        $session = $sync->ensureForTenant($tenant);
        abort_if($session === null, 422, 'No se pudo crear la sesión de WhatsApp.');

        $session = $sync->enableAutoReconnect($session);

        if (! $session->isReady()) {
            try {
                $remote = $client->getSession($session->openwa_session_id);
                $status = (string) ($remote['status'] ?? $session->status);

                if (in_array($status, ['created', 'disconnected', 'failed'], true)) {
                    $client->startSession($session->openwa_session_id);
                }
            } catch (\Throwable) {
                // Continúa e intenta obtener QR.
            }
        }

        try {
            $session = $sync->refresh($session);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'ready' => false,
                'status' => $session->status,
                'error' => 'No se pudo consultar el estado de WhatsApp.',
            ], 503);
        }

        if ($session->isReady()) {
            return response()->json([
                'ready' => true,
                'phone' => $session->phone,
                'status' => $session->status,
            ]);
        }

        try {
            $qr = $client->getQrCode($session->openwa_session_id);

            return response()->json([
                'ready' => false,
                'status' => (string) ($qr['status'] ?? $session->status),
                'qr_code' => $qr['qrCode'] ?? null,
                'session_id' => $session->openwa_session_id,
            ]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'ready' => false,
                'status' => $session->status,
                'error' => 'No se pudo obtener el código QR.',
            ], 503);
        }
    }

    public function logout(
        TenantManager $tenants,
        TenantWhatsAppSessionSync $sync,
    ): RedirectResponse {
        $tenant = $tenants->current()?->tenant;
        abort_if($tenant === null, 404);

        $session = TenantWhatsAppSession::query()
            ->where('tenant_id', $tenant->id)
            ->first();
        abort_if($session === null || ! $session->isReady(), 422, 'No hay WhatsApp conectado para desvincular.');

        try {
            $sync->disconnect($session);
        } catch (\Throwable $e) {
            report($e);

            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'No se pudo desvincular WhatsApp. Intenta de nuevo o contacta a soporte.',
            ]);

            return back();
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'WhatsApp desvinculado. Puedes conectar otro número cuando quieras.',
        ]);

        return back();
    }

    public function sendTest(
        Request $request,
        TenantManager $tenants,
        NotificationQueueService $queue,
        WhatsAppNotificationDispatcher $dispatcher,
    ): RedirectResponse {
        $data = $request->validate([
            'destinatario' => ['required', 'string', 'max:30'],
            'mensaje' => ['required', 'string', 'max:1000'],
        ]);

        $tenant = $tenants->current()?->tenant;
        abort_if($tenant === null, 404);

        $chatId = WhatsAppChatId::fromPhone($data['destinatario']);
        if ($chatId === null) {
            return back()
                ->withErrors(['destinatario' => 'Ingresa un número válido (ej. 987654321 o 51987654321).'])
                ->withInput();
        }

        $session = TenantWhatsAppSession::query()
            ->where('tenant_id', $tenant->id)
            ->first();

        if ($session !== null && ! $session->isReady()) {
            try {
                $session = app(TenantWhatsAppSessionSync::class)->refresh($session);
            } catch (\Throwable) {
                $session = null;
            }
        }

        $sessionChatId = WhatsAppChatId::fromPhone($session?->phone);
        if ($sessionChatId !== null && $sessionChatId === $chatId) {
            return back()
                ->withErrors([
                    'destinatario' => 'Usa otro número: no se puede enviar la prueba al mismo WhatsApp vinculado al taller.',
                ])
                ->withInput();
        }

        $item = $queue->enqueue(
            tipo: 'prueba',
            destinatario: $chatId,
            cuerpo: $data['mensaje'],
            enviarAt: now(),
            destinatarioNombre: null,
            prioridad: 1,
        );

        if (! $item instanceof NotificationQueue) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'No se pudo encolar el mensaje de prueba.']);

            return back();
        }

        try {
            $dispatcher->dispatchOne($item, $tenant);
        } catch (\Throwable $e) {
            report($e);

            Inertia::flash('toast', ['type' => 'error', 'message' => 'Error al enviar: '.$e->getMessage()]);

            return back();
        }

        $item->refresh();

        if ($item->estado === NotificationQueue::ESTADO_ENVIADO) {
            Inertia::flash('toast', [
                'type' => 'success',
                'message' => 'Mensaje de prueba enviado. Revisa el histórico o el teléfono destino.',
            ]);

            return back();
        }

        Inertia::flash('toast', [
            'type' => 'error',
            'message' => $item->error_mensaje ?? 'No se pudo enviar el mensaje. Verifica que WhatsApp siga conectado.',
        ]);

        return back();
    }
}
