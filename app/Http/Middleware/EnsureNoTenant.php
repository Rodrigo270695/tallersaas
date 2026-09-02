<?php

namespace App\Http\Middleware;

use App\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloquea el acceso a rutas que SOLO existen en el dominio central
 * (panel SaaS de Orvae/superadmin). Funciona en pareja con `ResolveTenant`.
 */
class EnsureNoTenant
{
    public function __construct(protected TenantManager $manager) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->manager->check()) {
            abort(404);
        }

        return $next($request);
    }
}
