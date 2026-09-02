<?php

namespace App\Tenancy\Exceptions;

use App\Models\Tenant;
use RuntimeException;
use Throwable;

/**
 * Se lanza cuando el tenant existe pero su `estado` no está dentro de
 * `tenant.allowed_states` (típicamente `suspended` o `cancelled`), o
 * cuando su suscripción venció y ya pasó la ventana de gracia.
 */
class TenantSuspendedException extends RuntimeException
{
    public function __construct(
        public readonly Tenant $tenant,
        public readonly string $blockType = 'suspended',
        ?Throwable $previous = null,
    ) {
        parent::__construct(
            sprintf(
                'Tenant "%s" no puede acceder (estado: %s, bloqueo: %s).',
                $tenant->slug ?? $tenant->getKey(),
                $tenant->estado ?? 'unknown',
                $blockType,
            ),
            0,
            $previous,
        );
    }
}
