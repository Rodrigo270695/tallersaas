<?php

use App\Tenancy\TenantContext;
use App\Tenancy\TenantManager;

if (! function_exists('current_tenant')) {
    /**
     * Contexto del tenant activo del request (null en dominio central).
     */
    function current_tenant(): ?TenantContext
    {
        return app(TenantManager::class)->current();
    }
}

if (! function_exists('tenant_id')) {
    /**
     * UUID del tenant activo (null en dominio central).
     */
    function tenant_id(): ?string
    {
        return app(TenantManager::class)->id();
    }
}

if (! function_exists('tenant_slug')) {
    function tenant_slug(): ?string
    {
        return app(TenantManager::class)->slug();
    }
}

if (! function_exists('is_public_demo_tenant')) {
    /**
     * Tenant público de demostración (slug fijo `demo`).
     * Ahí no se deben editar roles/permisos ni usuarios desde la UI.
     */
    function is_public_demo_tenant(): bool
    {
        $slug = current_tenant()?->slug
            ?? tenant_slug()
            ?? null;

        return $slug === 'demo';
    }
}
