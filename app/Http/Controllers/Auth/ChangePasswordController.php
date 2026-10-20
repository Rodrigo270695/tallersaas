<?php

namespace App\Http\Controllers\Auth;

use App\Concerns\PasswordValidationRules;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

/**
 * Cambio obligatorio de contraseña al primer login (o tras reset del flag).
 */
class ChangePasswordController extends Controller
{
    use PasswordValidationRules;

    public function show(): Response
    {
        return Inertia::render('auth/change-password');
    }

    public function update(Request $request): HttpResponse
    {
        $user = $request->user('web');

        abort_if($user === null, 401);
        abort_if(! $user instanceof User, 401);

        $data = $request->validate([
            'password' => $this->passwordRules(),
        ]);

        if (Hash::check($data['password'], $user->getAuthPassword())) {
            throw ValidationException::withMessages([
                'password' => 'La nueva contraseña debe ser distinta a la actual.',
            ]);
        }

        $updates = [
            'password' => $data['password'],
            'must_change_password' => false,
            'bootstrap_login_token' => null,
            'bootstrap_login_expires_at' => null,
        ];

        if ($user->tenant_id !== null && $user->email_verified_at === null) {
            $updates['email_verified_at'] = now();
        }

        $user->forceFill($updates)->save();

        Auth::guard('web')->setUser($user->fresh());

        $request->session()->regenerate();

        $request->session()->flash('success', 'Tu contraseña fue actualizada.');

        if ($request->header('X-Inertia')) {
            return Inertia::location(route('dashboard'));
        }

        return redirect()->route('dashboard');
    }
}
