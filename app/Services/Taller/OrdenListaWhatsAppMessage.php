<?php

declare(strict_types=1);

namespace App\Services\Taller;

use App\Models\OrdenTrabajo;
use App\Models\TallerSetting;
use App\Tenancy\TenantManager;

final class OrdenListaWhatsAppMessage
{
    public function __construct(
        private readonly TenantManager $tenants,
    ) {}

    public function build(OrdenTrabajo $orden): string
    {
        $orden->loadMissing(['cliente:id,nombres,apellidos', 'vehiculo:id,placa,marca,modelo']);

        $settings = TallerSetting::current();
        $taller = trim((string) ($settings->nombre_comercial ?: $settings->razon_social ?: ''));
        if ($taller === '') {
            $context = $this->tenants->current();
            $taller = trim((string) ($context?->nombreComercial() ?: $context?->razonSocial() ?: 'el taller'));
        }

        $cliente = trim((string) ($orden->cliente?->nombres ?? 'hola'));
        $placa = trim((string) ($orden->vehiculo?->placa ?? ''));
        $vehiculo = trim(implode(' ', array_filter([
            $orden->vehiculo?->marca,
            $orden->vehiculo?->modelo,
            $placa !== '' ? "placa {$placa}" : null,
        ])));
        if ($vehiculo === '') {
            $vehiculo = 'tu vehículo';
        }

        $moneda = (string) ($settings->moneda ?: 'PEN');
        $saldo = round((float) $orden->saldo, 2);

        $lineas = [
            "Hola {$cliente} 👋",
            "Tu {$vehiculo} ya está listo para recoger en {$taller}.",
            "Orden {$orden->numero}.",
        ];

        if ($saldo > 0) {
            $lineas[] = 'Saldo pendiente: '.$this->money($saldo, $moneda).'.';
        }

        $lineas[] = 'Te esperamos.';

        return implode("\n", $lineas);
    }

    private function money(float $amount, string $moneda): string
    {
        $formatted = number_format($amount, 2, '.', ',');

        return $moneda === 'PEN' ? "S/ {$formatted}" : "{$moneda} {$formatted}";
    }
}
