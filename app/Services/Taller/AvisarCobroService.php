<?php

declare(strict_types=1);

namespace App\Services\Taller;

use App\Models\Cliente;
use App\Models\NotificationQueue;
use App\Models\OrdenTrabajo;
use App\Models\Venta;
use App\Services\Notifications\NotificationQueueService;
use App\Services\Notifications\WhatsAppNotificationDispatcher;
use App\Services\OpenWa\OpenWaClient;
use App\Support\WhatsApp\WhatsAppChatId;
use App\Tenancy\TenantManager;
use Throwable;

final class AvisarCobroService
{
    public function __construct(
        private readonly CobroWhatsAppMessage $messages,
        private readonly NotificationQueueService $queue,
        private readonly WhatsAppNotificationDispatcher $dispatcher,
        private readonly OpenWaClient $openwa,
        private readonly TenantManager $tenants,
    ) {}

    /**
     * @return array{wa_url: ?string, enviado: bool, encolado: bool}
     */
    public function avisar(OrdenTrabajo $orden, Venta $venta): array
    {
        $vacio = ['wa_url' => null, 'enviado' => false, 'encolado' => false];

        $orden->loadMissing('cliente:id,nombres,apellidos,telefono');
        $cliente = $orden->cliente;
        if (! $cliente instanceof Cliente) {
            return $vacio;
        }

        $digits = WhatsAppChatId::digits((string) $cliente->telefono);
        $chatId = WhatsAppChatId::fromPhone((string) $cliente->telefono);
        if ($digits === null || $chatId === null) {
            return $vacio;
        }

        $orden->refresh();
        $texto = $this->messages->build($orden, $venta);
        $tenant = $this->tenants->current()?->tenant;
        if ($tenant === null) {
            return [
                'wa_url' => WhatsAppChatId::waMeUrl($digits, $texto),
                'enviado' => false,
                'encolado' => false,
            ];
        }

        $item = $this->queue->enqueue(
            tipo: 'ot_cobro',
            destinatario: $chatId,
            cuerpo: $texto,
            enviarAt: now(),
            destinatarioNombre: trim((string) ($cliente->nombres ?? '')),
            referenciaTipo: 'venta',
            referenciaId: $venta->id,
            dedupeKey: 'ot_cobro:'.$venta->id,
            prioridad: 2,
        );

        $enviado = false;
        if ($item instanceof NotificationQueue && $this->openwa->isConfigured()) {
            try {
                $enviado = $this->dispatcher->dispatchOne($item, $tenant);
            } catch (Throwable) {
                $enviado = false;
            }
        }

        return [
            'wa_url' => $enviado ? null : WhatsAppChatId::waMeUrl($digits, $texto),
            'enviado' => $enviado,
            'encolado' => $item instanceof NotificationQueue,
        ];
    }
}
