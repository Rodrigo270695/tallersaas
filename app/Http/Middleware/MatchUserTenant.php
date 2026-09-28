<?php

namespace App\Http\Middleware;

use App\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Garantiza que el usuario autenticado pertenece al tenant del host.
 *
 * Arquitectura "single-login + datos aislados": el mismo `App\Models\User`
 * autentica a todos. Nada impide que un atacante intente reusar su sesión
 * apuntando a un host distinto si no validamos activamente que
 * `user.tenant_id` ↔ `request.tenant` coincidan.
 */
class MatchUserTenant
{
    public function __construct(protected TenantManager $manager) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::guard('web')->user();

        if ($user === null) {
            return $next($request);
        }

        $hostTenantId = $this->manager->check() ? $this->manager->current()?->id() : null;
        $userTenantId = $user->tenant_id;

        if ($hostTenantId !== null
            && $userTenantId === null
            && $user->isPlatformSuperadmin()) {
            $imp = $request->session()->get('tenant_impersonation');
            if (is_array($imp)
                && isset($imp['tenant_id'])
                && (string) $imp['tenant_id'] === (string) $hostTenantId) {
                return $next($request);
            }
        }

        if ($hostTenantId === $userTenantId) {
            return $next($request);
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        abort(403, $this->buildMessage($hostTenantId, $userTenantId));
    }

    private function buildMessage(?string $hostTenantId, ?string $userTenantId): string
    {
        if ($hostTenantId === null && $userTenantId !== null) {
            return 'Tu cuenta pertenece a un taller. Inicia sesión desde el subdominio de tu taller.';
        }
        if ($hostTenantId !== null && $userTenantId === null) {
            return 'Este es el panel de un taller. Tu cuenta es del panel central de TallerSaaS.';
        }

        return 'Tu cuenta no tiene acceso a este taller.';
    }
}
