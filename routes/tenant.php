<?php

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

Route::get('impersonate/accept', [TenantImpersonationController::class, 'accept'])
    ->name('impersonate.accept');
