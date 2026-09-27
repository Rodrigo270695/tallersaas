<?php

declare(strict_types=1);

namespace App\Services\Taller;

use App\Models\OrdenTrabajo;
use App\Models\TallerSetting;
use App\Models\Venta;
use App\Tenancy\TenantManager;

final class CobroWhatsAppMessage
{
    public function __construct(
        private readonly TenantManager $tenants,
    ) {}

    public function build(OrdenTrabajo $orden, Venta $venta): string
    {
        $orden->loadMissing([
            'cliente:id,nombres,apellidos',
            'vehiculo:id,placa',
        ]);

        $settings = TallerSetting::current();
        $taller = trim((string) ($settings->nombre_comercial ?: $settings->razon_social ?: ''));
        if ($taller === '') {
            $context = $this->tenants->current();
            $taller = trim((string) ($context?->nombreComercial() ?: $context?->razonSocial() ?: 'el taller'));
        }

        $cliente = trim((string) ($orden->cliente?->nombres ?? 'hola'));
        $placa = trim((string) ($orden->vehiculo?->placa ?? ''));
        $moneda = (string) ($settings->moneda ?: 'PEN');
        $pagado = round((float) $venta->total, 2);
        $saldo = round((float) $orden->saldo, 2);

        $lineas = [
            "Hola {$cliente} 👋",
            "Registramos tu pago de {$this->money($pagado, $moneda)} en {$taller}.",
            "Orden {$orden->numero}".($placa !== '' ? " · placa {$placa}." : '.'),
        ];

        if ($saldo > 0.009) {
            $lineas[] = 'Saldo pendiente: '.$this->money($saldo, $moneda).'.';
        } else {
            $lineas[] = 'La orden quedó saldada.';
        }

        $lineas[] = 'Gracias por confiar en nosotros.';

        return implode("\n", $lineas);
    }

    private function money(float $amount, string $moneda): string
    {
        $formatted = number_format($amount, 2, '.', ',');

        return $moneda === 'PEN' ? "S/ {$formatted}" : "{$moneda} {$formatted}";
    }
}
