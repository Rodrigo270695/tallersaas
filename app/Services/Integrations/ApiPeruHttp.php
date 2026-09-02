<?php

namespace App\Services\Integrations;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Cliente HTTP base para {@link https://apiperu.dev apiperu.dev}: fuente
 * PRIMARIA de consulta de DNI/RUC. Si falla, los servicios que lo usan
 * caen a APISUNAT (ver {@see ApisunatLookupService}).
 */
final class ApiPeruHttp
{
    public static function client(): PendingRequest
    {
        $token = trim((string) config('services.apiperu.token', ''));

        if ($token === '') {
            throw new ApiPeruConsultaException(
                'ApiPerú no está configurado (falta APIPERU_TOKEN).',
                503,
                'not_configured',
            );
        }

        $base = rtrim((string) config('services.apiperu.base_url', 'https://apiperu.dev/api'), '/');

        return Http::timeout(25)
            ->acceptJson()
            ->withToken($token)
            ->baseUrl($base);
    }

    public static function assertSuccessful(Response $response, ?string $path = null): void
    {
        if ($response->successful()) {
            return;
        }

        $status = $response->status();
        $pathHint = $path !== null && $path !== '' ? " (ruta {$path})" : '';

        if ($status === 429) {
            throw new ApiPeruConsultaException(
                'ApiPerú alcanzó el límite de consultas. Intenta de nuevo en un momento.',
                429,
                'rate_limit',
            );
        }

        if ($status === 404) {
            throw new ApiPeruConsultaException(
                'ApiPerú no encontró este endpoint'.$pathHint.'. Suele ser ruta incorrecta o un servicio que no está en tu plan.',
                404,
                'not_found',
            );
        }

        if ($status === 402 || $status === 403) {
            throw new ApiPeruConsultaException(
                'Tu plan ApiPerú no incluye este servicio o no tienes cupo'.$pathHint.'.',
                $status,
                'plan_restricted',
            );
        }

        if ($status >= 500) {
            throw new ApiPeruConsultaException(
                'ApiPerú no está disponible en este momento.',
                503,
                'service_unavailable',
            );
        }

        throw new ApiPeruConsultaException(
            "ApiPerú respondió con un error inesperado (HTTP {$status}).".$pathHint,
            422,
            'api_error',
        );
    }
}
