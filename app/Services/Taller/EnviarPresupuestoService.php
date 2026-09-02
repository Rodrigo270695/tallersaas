<?php

declare(strict_types=1);

namespace App\Services\Taller;

use App\Models\Cliente;
use App\Models\NotificationQueue;
use App\Models\Presupuesto;
use App\Services\Notifications\NotificationQueueService;
use App\Services\Notifications\WhatsAppNotificationDispatcher;
use App\Services\OpenWa\OpenWaClient;
use App\Support\WhatsApp\WhatsAppChatId;
use App\Tenancy\TenantManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class EnviarPresupuestoService
{
    public function __construct(
        private readonly PresupuestoWhatsAppMessage $messages,
        private readonly NotificationQueueService $queue,
        private readonly WhatsAppNotificationDispatcher $dispatcher,
        private readonly OpenWaClient $openwa,
        private readonly TenantManager $tenants,
    ) {}

    /**
     * @return array{telefono: string, mensaje: string, wa_url: ?string, canal: 'openwa'|'wa.me', enviado: bool, encolado: bool, link: string}
     */
    public function enviar(Presupuesto $presupuesto, string $telefono, ?string $mensaje, bool $guardarEnCliente): array
    {
        $presupuesto->sincronizarVencimiento();
        $presupuesto->refresh();

        if (! $presupuesto->puedeEnviarse()) {
            throw ValidationException::withMessages([
                'presupuesto' => 'Agrega líneas con total antes de enviar el presupuesto.',
            ]);
        }

        if (in_array($presupuesto->estado, [Presupuesto::ESTADO_RECHAZADO, Presupuesto::ESTADO_VENCIDO, Presupuesto::ESTADO_CONVERTIDO], true)) {
            throw ValidationException::withMessages([
                'presupuesto' => 'Este presupuesto ya no se puede enviar.',
            ]);
        }

        $digits = WhatsAppChatId::digits($telefono);
        $chatId = WhatsAppChatId::fromPhone($telefono);
        if ($digits === null || $chatId === null) {
            throw ValidationException::withMessages([
                'telefono' => 'Indica un número de WhatsApp válido (9 dígitos, o con código 51).',
            ]);
        }

        $link = $presupuesto->publicUrl();
        $texto = trim((string) $mensaje);
        if ($texto === '') {
            $texto = $this->messages->build($presupuesto, $link);
        }

        DB::transaction(function () use ($presupuesto, $telefono, $guardarEnCliente): void {
            $presupuesto->loadMissing('cliente:id,nombres,apellidos,telefono');

            if ($guardarEnCliente && $presupuesto->cliente instanceof Cliente) {
                $presupuesto->cliente->telefono = $telefono;
                $presupuesto->cliente->save();
            }

            $presupuesto->forceFill([
                'estado' => Presupuesto::ESTADO_ENVIADO,
                'enviado_at' => now(),
            ])->save();
        });

        $encolado = false;
        $enviado = false;
        $tenant = $this->tenants->current()?->tenant;

        if ($tenant !== null) {
            $item = $this->queue->enqueue(
                tipo: 'presupuesto',
                destinatario: $chatId,
                cuerpo: $texto,
                enviarAt: now(),
                destinatarioNombre: trim((string) ($presupuesto->cliente?->nombres ?? '')),
                referenciaTipo: 'presupuesto',
                referenciaId: $presupuesto->id,
                dedupeKey: 'presupuesto:'.$presupuesto->id.':'.now()->timestamp,
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
            'link' => $link,
            'wa_url' => $enviado ? null : WhatsAppChatId::waMeUrl($digits, $texto),
            'canal' => $enviado ? 'openwa' : 'wa.me',
            'enviado' => $enviado,
            'encolado' => $encolado,
        ];
    }
}
