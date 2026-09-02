<?php

namespace App\Http\Middleware;

use App\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloquea el acceso a rutas que SOLO tienen sentido dentro del contexto
 * de un tenant (la app del taller). Se aplica como alias `tenant.required`.
 */
class EnsureTenant
{
    public function __construct(protected TenantManager $manager) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->manager->check()) {
            return $next($request);
        }

        abort(404);
    }
}
