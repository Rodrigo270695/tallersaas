<?php

namespace App\Tenancy\Exceptions;

use RuntimeException;
use Throwable;

/**
 * Se lanza cuando un subdominio no corresponde a ningún tenant existente,
 * o cuando el tenant existe pero tiene `schema_name` inválido / vacío.
 */
class TenantNotFoundException extends RuntimeException
{
    public function __construct(
        public readonly string $identifier,
        ?Throwable $previous = null,
    ) {
        parent::__construct(
            sprintf('Tenant no encontrado: "%s".', $identifier),
            0,
            $previous,
        );
    }
}
