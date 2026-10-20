<?php

use App\Http\Controllers\Auth\BootstrapLoginController;
use App\Http\Controllers\TenantImpersonationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rutas exclusivas de subdominios de tenant
|--------------------------------------------------------------------------
|
| Se registran con `->domain('{tenant_subdomain}.'.config('tenant.root_domain'))`
| desde bootstrap/app.php, así que solo se enrutan cuando el host coincide
| (ej. `taller-rivera.tallersaas.test`). El dominio central nunca colisiona
| con estas rutas.
|
*/

Route::middleware(['tenant.required'])->group(function (): void {
    Route::get('auth/bienvenida/{token}', [BootstrapLoginController::class, 'show'])
        ->where('token', '[A-Za-z0-9]{40,128}')
        ->middleware(['throttle:20,1'])
        ->name('tenant.auth.bootstrap');

    Route::post('auth/bienvenida/{token}', [BootstrapLoginController::class, 'store'])
        ->where('token', '[A-Za-z0-9]{40,128}')
        ->middleware(['throttle:20,1'])
        ->name('tenant.auth.bootstrap.store');
});

Route::get('impersonate/accept', [TenantImpersonationController::class, 'accept'])
    ->name('impersonate.accept');
