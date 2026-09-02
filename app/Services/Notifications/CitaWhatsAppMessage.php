<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Models\TallerSetting;
use App\Tenancy\TenantManager;
use Carbon\CarbonInterface;

final class CitaWhatsAppMessage
{
    public function __construct(
        private readonly TenantManager $tenants,
    ) {}

    public function tallerDisplayName(?TallerSetting $setting = null): string
    {
        $setting ??= TallerSetting::current();
        $taller = trim((string) ($setting->nombre_comercial ?: $setting->razon_social ?: ''));
        if ($taller === '') {
            $context = $this->tenants->current();
            $taller = trim((string) ($context?->nombreComercial() ?: $context?->razonSocial() ?: 'el taller'));
        }

        return $taller !== '' ? $taller : 'el taller';
    }

    public function cita48h(
        string $taller,
        string $cliente,
        string $vehiculo,
        CarbonInterface $iniciaAt,
        ?string $motivo = null,
    ): string {
        return sprintf(
            "Hola %s 👋\n\n⏰ Te recordamos la cita de *%s* en *%s*\n%s📅 *%s* a las *%s*\n\nSi necesitas reprogramar, contáctanos.\n\nTe esperamos.\n\n— %s",
            $cliente,
            $vehiculo,
            $taller,
            $this->motivoLine($motivo),
            $iniciaAt->timezone((string) config('app.timezone'))->format('d/m/Y'),
            $iniciaAt->timezone((string) config('app.timezone'))->format('H:i'),
            $taller,
        );
    }

    public function cita2h(
        string $taller,
        string $cliente,
        string $vehiculo,
        CarbonInterface $iniciaAt,
        ?string $motivo = null,
    ): string {
        return sprintf(
            "Hola %s 👋\n\n⏳ En *2 horas* tienes cita de *%s* en *%s*\n%s🕒 *%s*\n\n¡Nos vemos pronto!\n\n— %s",
            $cliente,
            $vehiculo,
            $taller,
            $this->motivoLine($motivo),
            $iniciaAt->timezone((string) config('app.timezone'))->format('H:i'),
            $taller,
        );
    }

    public function citaCreada(
        string $taller,
        string $cliente,
        string $vehiculo,
        CarbonInterface $iniciaAt,
        ?string $motivo = null,
    ): string {
        return sprintf(
            "Hola %s 👋\n\n✅ Registramos la cita de *%s* en *%s*\n%s📅 *%s* a las *%s*\n\nTe esperamos.\n\n— %s",
            $cliente,
            $vehiculo,
            $taller,
            $this->motivoLine($motivo),
            $iniciaAt->timezone((string) config('app.timezone'))->format('d/m/Y'),
            $iniciaAt->timezone((string) config('app.timezone'))->format('H:i'),
            $taller,
        );
    }

    public function citaReprogramada(
        string $taller,
        string $cliente,
        string $vehiculo,
        CarbonInterface $iniciaAt,
        ?string $motivo = null,
    ): string {
        return sprintf(
            "Hola %s 👋\n\n🔄 Reprogramamos la cita de *%s* en *%s*\n%s📅 Nueva fecha: *%s* a las *%s*\n\nTe esperamos.\n\n— %s",
            $cliente,
            $vehiculo,
            $taller,
            $this->motivoLine($motivo),
            $iniciaAt->timezone((string) config('app.timezone'))->format('d/m/Y'),
            $iniciaAt->timezone((string) config('app.timezone'))->format('H:i'),
            $taller,
        );
    }

    public function citaActualizada(
        string $taller,
        string $cliente,
        string $vehiculo,
        CarbonInterface $iniciaAt,
        ?string $motivo = null,
    ): string {
        return sprintf(
            "Hola %s 👋\n\n✏️ Actualizamos la cita de *%s* en *%s*\n%s📅 *%s* a las *%s*\n\nTe esperamos.\n\n— %s",
            $cliente,
            $vehiculo,
            $taller,
            $this->motivoLine($motivo),
            $iniciaAt->timezone((string) config('app.timezone'))->format('d/m/Y'),
            $iniciaAt->timezone((string) config('app.timezone'))->format('H:i'),
            $taller,
        );
    }

    private function motivoLine(?string $motivo): string
    {
        $motivo = trim((string) $motivo);
        if ($motivo === '') {
            return '';
        }

        return '📋 Motivo: *'.$motivo."*\n";
    }
}
