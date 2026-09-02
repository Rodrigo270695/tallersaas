<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Models\Cita;
use App\Models\NotificationQueue;
use App\Models\TallerSetting;
use App\Services\OpenWa\OpenWaClient;
use App\Support\WhatsApp\WhatsAppChatId;
use App\Tenancy\TenantManager;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Log;

final class CitaWhatsAppNotifier
{
    public function __construct(
        private readonly NotificationQueueService $queue,
        private readonly WhatsAppNotificationDispatcher $dispatcher,
        private readonly CitaWhatsAppMessage $messages,
        private readonly OpenWaClient $openwa,
        private readonly TenantManager $tenants,
    ) {}

    /**
     * @param  'creada'|'actualizada'|'reprogramada'  $evento
     * @return array{type: 'warning'|'info'|'success', message: string}|null
     */
    public function enqueue(Cita $cita, string $evento): ?array
    {
        $setting = TallerSetting::current();
        if (! (bool) ($setting->notificar_cita_whatsapp_activo ?? true)) {
            return null;
        }

        $cita->loadMissing([
            'cliente:id,nombres,apellidos,telefono',
            'vehiculo:id,placa,marca_id,modelo_id',
            'vehiculo.marca:id,nombre',
            'vehiculo.modelo:id,nombre',
        ]);

        $chatId = WhatsAppChatId::fromPhone($cita->cliente?->telefono);
        if ($chatId === null) {
            return [
                'type' => 'warning',
                'message' => 'Cita guardada. Falta un WhatsApp válido en la ficha del cliente para avisarle.',
            ];
        }

        $tipo = match ($evento) {
            'reprogramada' => 'cita_reprogramada',
            'actualizada' => 'cita_actualizada',
            default => 'cita_creada',
        };

        $iniciaAt = $cita->inicia_at;
        if (! $iniciaAt instanceof CarbonInterface) {
            return null;
        }

        $taller = $this->messages->tallerDisplayName($setting);
        $cliente = trim((string) ($cita->cliente?->nombres ?? 'cliente')) ?: 'cliente';
        $vehiculo = $this->vehiculoLabel($cita);
        $motivo = trim((string) ($cita->motivo ?? ''));
        $motivo = $motivo !== '' ? $motivo : null;

        $cuerpo = match ($evento) {
            'reprogramada' => $this->messages->citaReprogramada($taller, $cliente, $vehiculo, $iniciaAt, $motivo),
            'actualizada' => $this->messages->citaActualizada($taller, $cliente, $vehiculo, $iniciaAt, $motivo),
            default => $this->messages->citaCreada($taller, $cliente, $vehiculo, $iniciaAt, $motivo),
        };

        try {
            $item = $this->queue->enqueue(
                tipo: $tipo,
                destinatario: $chatId,
                cuerpo: $cuerpo,
                enviarAt: now(),
                destinatarioNombre: $cliente,
                referenciaTipo: 'cita',
                referenciaId: $cita->id,
                dedupeKey: $tipo.':'.$cita->id.':'.$iniciaAt->timestamp,
                prioridad: 2,
            );
        } catch (\Throwable $e) {
            Log::warning('No se pudo encolar WhatsApp de cita', [
                'cita_id' => $cita->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'type' => 'warning',
                'message' => 'Cita guardada, pero no se pudo encolar el aviso de WhatsApp.',
            ];
        }

        if (! $item instanceof NotificationQueue) {
            return null;
        }

        $tenant = $this->tenants->current()?->tenant;
        if ($tenant !== null && $this->openwa->isConfigured()) {
            try {
                $this->dispatcher->dispatchOne($item, $tenant);
                $item->refresh();
            } catch (\Throwable $e) {
                Log::warning('No se pudo enviar WhatsApp de cita de inmediato', [
                    'cita_id' => $cita->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if ($item->estado === NotificationQueue::ESTADO_ENVIADO) {
            return [
                'type' => 'success',
                'message' => 'Aviso de cita enviado por WhatsApp.',
            ];
        }

        return [
            'type' => 'info',
            'message' => 'Aviso de cita encolado. Se enviará cuando WhatsApp esté conectado.',
        ];
    }

    private function vehiculoLabel(Cita $cita): string
    {
        $placa = trim((string) ($cita->vehiculo?->placa ?? ''));
        $label = trim(implode(' ', array_filter([
            $cita->vehiculo?->marca?->nombre,
            $cita->vehiculo?->modelo?->nombre,
            $placa !== '' ? $placa : null,
        ])));

        return $label !== '' ? $label : 'tu vehículo';
    }
}
