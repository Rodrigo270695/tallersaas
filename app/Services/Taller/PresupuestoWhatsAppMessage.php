<?php

declare(strict_types=1);

namespace App\Services\Taller;

use App\Models\Presupuesto;
use App\Models\TallerSetting;
use App\Tenancy\TenantManager;
use Carbon\CarbonInterface;

final class PresupuestoWhatsAppMessage
{
    public function __construct(
        private readonly TenantManager $tenants,
    ) {}

    public function build(Presupuesto $presupuesto, ?string $linkOverride = null): string
    {
        $presupuesto->loadMissing(['cliente:id,nombres,apellidos', 'vehiculo:id,placa,marca,modelo']);

        $taller = $this->tallerDisplayName();
        $cliente = trim((string) ($presupuesto->cliente?->nombres ?? 'cliente')) ?: 'cliente';
        $vehiculo = $this->vehiculoLabel($presupuesto);
        $total = number_format((float) $presupuesto->total, 2, '.', ',');
        $link = $linkOverride ?? $presupuesto->publicUrl();
        $validez = $this->validezLine($presupuesto);

        return sprintf(
            "Hola %s 👋\n\n📋 *%s* te envía el presupuesto para *%s*\nReferencia: *%s*\nTotal estimado: *S/ %s*\n%s\nRevisa el detalle y confirma aquí:\n%s\n\n— %s",
            $cliente,
            $taller,
            $vehiculo,
            $presupuesto->numero,
            $total,
            $validez,
            $link,
            $taller,
        );
    }

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

    private function vehiculoLabel(Presupuesto $presupuesto): string
    {
        $placa = trim((string) ($presupuesto->vehiculo?->placa ?? ''));
        $label = trim(implode(' ', array_filter([
            $presupuesto->vehiculo?->marca,
            $presupuesto->vehiculo?->modelo,
            $placa !== '' ? "placa {$placa}" : null,
        ])));

        return $label !== '' ? $label : 'tu vehículo';
    }

    private function validezLine(Presupuesto $presupuesto): string
    {
        $valido = $presupuesto->valido_hasta;
        if (! $valido instanceof CarbonInterface) {
            return '';
        }

        return '⏳ Válido hasta: *'.$valido->timezone((string) config('app.timezone'))->format('d/m/Y')."*\n";
    }
}
