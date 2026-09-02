<?php

namespace App\Tenancy;

use App\Models\Tenant;

/**
 * Snapshot inmutable del tenant activo durante un request.
 *
 * Vive en el {@see TenantManager} desde que el middleware `ResolveTenant`
 * lo crea hasta que termina el request. Cualquier código que necesite saber
 * "¿en qué taller estoy?" debe pedírselo al manager o al helper
 * `current_tenant()`, no leer el host directamente.
 */
final class TenantContext
{
    public function __construct(
        public readonly Tenant $tenant,
        public readonly string $schema,
        public readonly string $slug,
    ) {}

    public function id(): string
    {
        return (string) $this->tenant->getKey();
    }

    public function razonSocial(): string
    {
        return (string) ($this->tenant->razon_social ?? '');
    }

    public function nombreComercial(): ?string
    {
        return $this->tenant->nombre_comercial;
    }

    public function estado(): string
    {
        return (string) ($this->tenant->estado ?? '');
    }

    public function isTrial(): bool
    {
        return $this->estado() === 'trial';
    }

    public function isActive(): bool
    {
        return $this->estado() === 'active';
    }

    public function isGrace(): bool
    {
        return $this->estado() === 'grace';
    }
}
