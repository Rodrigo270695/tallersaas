<?php

declare(strict_types=1);

namespace App\Services\Taller;

use App\Models\Cliente;
use App\Models\NotificationQueue;
use App\Models\OrdenTrabajo;
use App\Services\Notifications\NotificationQueueService;
use App\Services\Notifications\WhatsAppNotificationDispatcher;
use App\Services\OpenWa\OpenWaClient;
use App\Support\WhatsApp\WhatsAppChatId;
use App\Tenancy\TenantManager;
use Illuminate\Validation\ValidationException;

final class AvisarOrdenListaService
{
    public function __construct(
        private readonly OrdenListaWhatsAppMessage $messages,
        private readonly NotificationQueueService $queue,
        private readonly WhatsAppNotificationDispatcher $dispatcher,
        private readonly OpenWaClient $openwa,
        private readonly TenantManager $tenants,
    ) {}

    /**
     * @return array{telefono: string, mensaje: string, wa_url: ?string, canal: 'openwa'|'wa.me', enviado: bool, encolado: bool}
     */
    public function avisar(OrdenTrabajo $orden, string $telefono, ?string $mensaje, bool $guardarEnCliente): array
    {
        if (! in_array($orden->estado, [OrdenTrabajo::ESTADO_LISTA, OrdenTrabajo::ESTADO_ENTREGADA], true)) {
            throw ValidationException::withMessages([
                'orden' => 'Marca la orden como lista antes de avisar al cliente.',
            ]);
        }

        $digits = WhatsAppChatId::digits($telefono);
        $chatId = WhatsAppChatId::fromPhone($telefono);
        if ($digits === null || $chatId === null) {
            throw ValidationException::withMessages([
                'telefono' => 'Indica un número de WhatsApp válido (9 dígitos, o con código 51).',
            ]);
        }

        $texto = trim((string) $mensaje);
        if ($texto === '') {
            $texto = $this->messages->build($orden);
        }

        $orden->loadMissing('cliente:id,nombres,apellidos,telefono');

        if ($guardarEnCliente && $orden->cliente instanceof Cliente) {
            $orden->cliente->telefono = $telefono;
            $orden->cliente->save();
        }

        $orden->lista_notificada_at = now();
        $orden->save();

        $encolado = false;
        $enviado = false;
        $tenant = $this->tenants->current()?->tenant;

        if ($tenant !== null) {
            $item = $this->queue->enqueue(
                tipo: 'ot_lista',
                destinatario: $chatId,
                cuerpo: $texto,
                enviarAt: now(),
                destinatarioNombre: trim((string) ($orden->cliente?->nombres ?? '')),
                referenciaTipo: 'orden_trabajo',
                referenciaId: $orden->id,
                prioridad: 2,
            );

            if ($item instanceof NotificationQueue) {
                $encolado = true;

                if ($this->openwa->isConfigured()) {
                    try {
                        $enviado = $this->dispatcher->dispatchOne($item, $tenant);
                    } catch (\Throwable) {
                        $enviado = false;
                    }
                }
            }
        }

        return [
            'telefono' => $digits,
            'mensaje' => $texto,
            'wa_url' => $enviado ? null : WhatsAppChatId::waMeUrl($digits, $texto),
            'canal' => $enviado ? 'openwa' : 'wa.me',
            'enviado' => $enviado,
            'encolado' => $encolado,
        ];
    }
}
