<?php

namespace App\Services\Integrations\Concerns;

use App\Services\Integrations\ApiPeruConsultaException;
use App\Services\Integrations\ApisunatLookupService;
use Illuminate\Http\Client\ConnectionException;
use Throwable;

/**
 * ApiPerú (apiperu.dev) es la fuente PRIMARIA. Si falla por cuota,
 * indisponibilidad o timeout, se reintenta con APISUNAT como respaldo.
 * Si APISUNAT también falla (o no está configurado), se conserva y
 * relanza el error original de ApiPerú.
 *
 * Requiere que la clase que use este trait tenga una propiedad
 * `$apisunatLookup` de tipo {@see ApisunatLookupService} (normalmente
 * inyectada por constructor).
 */
trait FallsBackToApisunatLookup
{
    /**
     * @param  callable(): array<string, mixed>  $apiPeruFetch
     * @param  callable(): array<string, mixed>  $apisunatFetch
     * @return array<string, mixed>
     */
    private function consultarConFallbackApisunat(callable $apiPeruFetch, callable $apisunatFetch): array
    {
        try {
            return $apiPeruFetch();
        } catch (ApiPeruConsultaException $e) {
            if (! $this->apisunatLookup->isConfigured() || ! $this->shouldFallbackToApisunat($e)) {
                throw $e;
            }

            try {
                return $apisunatFetch();
            } catch (Throwable) {
                throw $e;
            }
        } catch (ConnectionException $e) {
            if (! $this->apisunatLookup->isConfigured()) {
                throw new ApiPeruConsultaException(
                    'ApiPerú no está disponible en este momento.',
                    503,
                    'service_unavailable',
                );
            }

            try {
                return $apisunatFetch();
            } catch (Throwable) {
                throw new ApiPeruConsultaException(
                    'ApiPerú no está disponible en este momento.',
                    503,
                    'service_unavailable',
                );
            }
        }
    }

    private function shouldFallbackToApisunat(ApiPeruConsultaException $e): bool
    {
        return in_array($e->errorCode, [
            'rate_limit',
            'service_unavailable',
            'api_error',
            'not_configured',
        ], true);
    }
}
