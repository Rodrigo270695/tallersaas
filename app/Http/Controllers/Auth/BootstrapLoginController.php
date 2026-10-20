<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Entrada one-shot post-provisión Orvae: token → confirmar → sesión → cambiar contraseña.
 *
 * El login NO ocurre en GET (WhatsApp/correo suelen prefetchear el enlace).
 */
class BootstrapLoginController extends Controller
{
    public function show(Request $request, string $token): Response|RedirectResponse
    {
        $workshopName = $this->workshopName();
        $user = $this->resolveBootstrapUser($token);

        if ($user === null) {
            return Inertia::render('auth/bootstrap-welcome', [
                'token' => null,
                'valid' => false,
                'workshop_name' => $workshopName,
                'error' => 'Este enlace de bienvenida no es válido o ya no está disponible. '
                    .'Pide a soporte un nuevo enlace o usa «Olvidé mi contraseña» en el login.',
            ]);
        }

        if ($this->tokenExpired($user)) {
            return Inertia::render('auth/bootstrap-welcome', [
                'token' => null,
                'valid' => false,
                'workshop_name' => $workshopName,
                'error' => 'El enlace de bienvenida expiró. Usa «Olvidé mi contraseña» en el login '
                    .'o pide a soporte que te reenvíe el acceso.',
            ]);
        }

        return Inertia::render('auth/bootstrap-welcome', [
            'token' => $token,
            'valid' => true,
            'workshop_name' => $workshopName,
            'admin_email' => $user->email,
            'error' => null,
        ]);
    }

    public function store(Request $request, string $token): RedirectResponse
    {
        $user = $this->resolveBootstrapUser($token);

        abort_if($user === null, 404, 'Enlace de bienvenida inválido.');
        abort_unless($user->is_active === true, 403, 'Usuario inactivo.');
        abort_if(
            $this->tokenExpired($user),
            403,
            'El enlace de bienvenida expiró. Usa «Olvidé mi contraseña» en el login.',
        );

        $user->forceFill([
            'bootstrap_login_token' => null,
            'bootstrap_login_expires_at' => null,
        ])->save();

        Auth::guard('web')->login($user->fresh() ?? $user);
        $request->session()->regenerate();

        if ($user->must_change_password === true) {
            return redirect()
                ->route('password.change.form')
                ->with('success', 'Bienvenido. Elige tu contraseña para entrar a tu taller.');
        }

        return redirect()->route('dashboard');
    }

    private function resolveBootstrapUser(string $token): ?User
    {
        $tenantId = tenant_id();
        if ($tenantId === null) {
            return null;
        }

        $token = trim($token);
        if ($token === '' || strlen($token) < 32) {
            return null;
        }

        return User::query()
            ->where('tenant_id', $tenantId)
            ->where('bootstrap_login_token', hash('sha256', $token))
            ->first();
    }

    private function tokenExpired(User $user): bool
    {
        return $user->bootstrap_login_expires_at !== null
            && $user->bootstrap_login_expires_at->isPast();
    }

    private function workshopName(): ?string
    {
        $ctx = current_tenant();
        if ($ctx === null) {
            return null;
        }

        $comercial = trim((string) ($ctx->nombreComercial() ?? ''));
        if ($comercial !== '') {
            return $comercial;
        }

        $razon = trim($ctx->razonSocial());

        return $razon !== '' ? $razon : null;
    }
}
