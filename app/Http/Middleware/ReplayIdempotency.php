<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Evita duplicar un cobro o un alta cuando la tablet reenvía
 * un cambio que ya se guardó pero cuya respuesta se perdió sin conexión.
 */
class ReplayIdempotency
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return $next($request);
        }

        $key = (string) $request->header('X-Idempotency-Key', '');
        if (! preg_match('/^[A-Za-z0-9-]{8,80}$/', $key)) {
            return $next($request);
        }

        $cacheKey = 'offline-idempotency:'.hash('sha256', $key);
        if (Cache::has($cacheKey)) {
            return response()->noContent();
        }

        $response = $next($request);

        $location = (string) $response->headers->get('Location', '');
        $loginRedirect = $response->isRedirection() && str_contains($location, '/login');

        if (! $loginRedirect && ($response->isSuccessful() || $response->isRedirection())) {
            Cache::put($cacheKey, true, now()->addDay());
        }

        return $response;
    }
}
