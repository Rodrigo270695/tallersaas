<?php

namespace App\Http\Middleware;

use App\Tenancy\Resolvers\SubdomainResolver;
use App\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Response;

/**
 * Entrada al sistema multi-tenant.
 *
 * Para cada request HTTP:
 *   1. Extrae el subdominio del host con {@see SubdomainResolver}.
 *   2. Si el host es central (panel SaaS) deja pasar sin hacer nada:
 *      el `search_path` se queda en `public` por defecto.
 *   3. Si el host es subdominio de tenant, le pide al manager que
 *      resuelva el slug y aplique `SET search_path` a la conexión.
 *
 * Las excepciones (`TenantNotFoundException`, `TenantSuspendedException`)
 * se dejan subir libremente: el handler global en `bootstrap/app.php`
 * las convierte en una respuesta 404/403 apropiada.
 */
class ResolveTenant
{
    public function __construct(
        protected SubdomainResolver $resolver,
        protected TenantManager $manager,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        // Evita que un search_path residual de otro tenant en la misma
        // conexión PgSQL afecte la resolución o las tablas de `public`.
        $this->manager->forget();

        $slug = $this->resolver->resolveFromRequest($request);

        if ($slug === null) {
            return $next($request);
        }

        $this->manager->resolveBySlug($slug);

        URL::defaults(['tenant_subdomain' => $slug]);

        $request->route()?->forgetParameter('tenant_subdomain');

        return $next($request);
    }
}
