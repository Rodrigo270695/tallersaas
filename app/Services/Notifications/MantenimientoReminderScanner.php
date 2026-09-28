<?php

namespace App\Services\Notifications;

use App\Models\Cliente;
use App\Models\NotificationQueue;
use App\Models\TallerSetting;
use App\Services\Ai\TallerIaOperaciones;
use App\Support\WhatsApp\WhatsAppChatId;

final class MantenimientoReminderScanner
{
    public function __construct(
        private readonly TallerIaOperaciones $operaciones,
        private readonly NotificationQueueService $queue,
        private readonly CitaWhatsAppMessage $messages,
    ) {}

    public function scan(): int
    {
        $taller = $this->messages->tallerDisplayName(TallerSetting::query()->first());
        $enqueued = 0;

        foreach ($this->operaciones->pendientes() as $alerta) {
            if ($alerta['cliente_id'] === null) {
                continue;
            }

            $cliente = Cliente::query()->find($alerta['cliente_id'], ['id', 'telefono', 'nombres']);
            $chatId = WhatsAppChatId::fromPhone($cliente?->telefono);
            if ($chatId === null) {
                continue;
            }

            $created = $this->queue->enqueue(
                tipo: 'mantenimiento',
                destinatario: $chatId,
                cuerpo: $this->operaciones->mensajeMantenimiento(
                    $taller,
                    (string) $alerta['cliente'],
                    (string) $alerta['auto'],
                    (string) $alerta['etiqueta'],
                    (string) $alerta['detalle'],
                ),
                enviarAt: now(),
                destinatarioNombre: (string) $alerta['cliente'],
                referenciaTipo: 'vehiculo',
                referenciaId: (string) $alerta['vehiculo_id'],
                dedupeKey: 'mant:'.$alerta['vehiculo_id'].':'.$alerta['tipo'].':'.now()->format('Y-m'),
            );

            if ($created instanceof NotificationQueue) {
                $enqueued++;
            }
        }

        return $enqueued;
    }
}
