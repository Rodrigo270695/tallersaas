<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Response;

/**
 * Visita al subdominio desde el panel, en otra ventana del navegador.
 *
 * La PWA y el panel comparten la cookie de sesión. Si esa ventana usara la
 * misma cookie, el superadmin entraría en modo soporte. Aquí la ventana
 * nueva usa otra cookie, solo de ese host, y queda como un visitante.
 */
class ExternalTenantVisit
{
    public const MARKER = 'tallersaas_visita';

    public const SESSION_COOKIE = 'tallersaas-visita';

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('impersonate/accept', 'impersonate/leave')) {
            $response = $next($request);
            $this->forgetVisitCookies($request, $response);

            return $response;
        }

        $external = $request->query('visita') === 'externa'
            || $request->cookie(self::MARKER) === '1';

        if (! $external) {
            return $next($request);
        }

        config([
            'session.cookie' => self::SESSION_COOKIE,
            'session.domain' => null,
        ]);

        $response = $next($request);

        if ($request->query('visita') === 'externa') {
            $response->headers->setCookie($this->hostCookie($request, self::MARKER, '1', now()->addHours(12)->getTimestamp()));
        }

        return $response;
    }

    private function forgetVisitCookies(Request $request, Response $response): void
    {
        $expired = now()->subYear()->getTimestamp();

        foreach ([self::MARKER, self::SESSION_COOKIE] as $name) {
            $response->headers->setCookie($this->hostCookie($request, $name, '', $expired));
        }
    }

    /**
     * Cookie solo de este host. El helper de Laravel rellena el dominio
     * con SESSION_DOMAIN y la marcaría en el panel y en la PWA.
     */
    private function hostCookie(Request $request, string $name, string $value, int $expires): Cookie
    {
        return new Cookie(
            $name,
            $value,
            $expires,
            '/',
            null,
            $request->isSecure(),
            true,
            false,
            Cookie::SAMESITE_LAX,
        );
    }
}
