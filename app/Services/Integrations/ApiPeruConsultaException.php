<?php

namespace App\Services\Integrations;

use RuntimeException;

/**
 * Error de consulta a un proveedor de identidad (ApiPerú o APISUNAT).
 * `errorCode` permite decidir si conviene intentar el respaldo.
 */
final class ApiPeruConsultaException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $httpStatus = 422,
        public readonly string $errorCode = 'consulta_error',
    ) {
        parent::__construct($message);
    }
}
