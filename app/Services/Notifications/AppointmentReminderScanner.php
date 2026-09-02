<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Models\Cita;
use App\Models\NotificationQueue;
use App\Models\TallerSetting;
use App\Support\WhatsApp\WhatsAppChatId;
use Carbon\CarbonInterface;

final class AppointmentReminderScanner
{
    public function __construct(
        private readonly NotificationQueueService $queue,
        private readonly CitaWhatsAppMessage $messages,
    ) {}

    /**
     * @return array{cita_dias: int, cita_2h: int}
     */
    public function scan(?CarbonInterface $now = null): array
    {
        $now ??= now();
        $setting = TallerSetting::query()->first();

        $taller = $this->messages->tallerDisplayName($setting);
        $countDays = 0;
        $count2h = 0;

        if ($setting?->recordatorio_48h_activo ?? true) {
            $countDays = $this->scanWindow(
                $now->copy()->addDays(2),
                'cita_48h',
                fn (Cita $cita) => $this->messages->cita48h(
                    $taller,
                    $this->clienteNombre($cita),
                    $this->vehiculoLabel($cita),
                    $cita->inicia_at,
                    $this->motivo($cita),
                ),
            );
        }

        if ($setting?->recordatorio_2h_activo ?? true) {
            $count2h = $this->scanWindow(
                $now->copy()->addHours(2),
                'cita_2h',
                fn (Cita $cita) => $this->messages->cita2h(
                    $taller,
                    $this->clienteNombre($cita),
                    $this->vehiculoLabel($cita),
                    $cita->inicia_at,
                    $this->motivo($cita),
                ),
            );
        }

        return ['cita_dias' => $countDays, 'cita_2h' => $count2h];
    }

    /**
     * @param  callable(Cita): string  $bodyBuilder
     */
    private function scanWindow(CarbonInterface $target, string $tipo, callable $bodyBuilder): int
    {
        $from = $target->copy()->subMinutes(30);
        $to = $target->copy()->addMinutes(30);

        $citas = Cita::query()
            ->with([
                'cliente:id,nombres,apellidos,telefono',
                'vehiculo:id,placa,marca_id,modelo_id',
                'vehiculo.marca:id,nombre',
                'vehiculo.modelo:id,nombre',
            ])
            ->whereIn('estado', [Cita::ESTADO_PROGRAMADA, Cita::ESTADO_CONFIRMADA])
            ->whereBetween('inicia_at', [$from, $to])
            ->get();

        $enqueued = 0;

        foreach ($citas as $cita) {
            $chatId = WhatsAppChatId::fromPhone($cita->cliente?->telefono);
            if ($chatId === null) {
                continue;
            }

            $created = $this->queue->enqueue(
                tipo: $tipo,
                destinatario: $chatId,
                cuerpo: $bodyBuilder($cita),
                enviarAt: now(),
                destinatarioNombre: $this->clienteNombre($cita),
                referenciaTipo: 'cita',
                referenciaId: $cita->id,
                dedupeKey: $tipo.':'.$cita->id,
                prioridad: $tipo === 'cita_2h' ? 3 : 5,
            );

            if ($created instanceof NotificationQueue) {
                $enqueued++;
            }
        }

        return $enqueued;
    }

    private function clienteNombre(Cita $cita): string
    {
        $full = trim((string) ($cita->cliente?->nombres ?? '').' '.(string) ($cita->cliente?->apellidos ?? ''));

        return $full !== '' ? $full : 'cliente';
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

    private function motivo(Cita $cita): ?string
    {
        $motivo = trim((string) ($cita->motivo ?? ''));

        return $motivo !== '' ? $motivo : null;
    }
}
