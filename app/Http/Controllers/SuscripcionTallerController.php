<?php

namespace App\Http\Controllers;

use App\Support\Subscriptions\TenantSubscriptionSummary;
use App\Tenancy\TenantManager;
use Inertia\Inertia;
use Inertia\Response;

class SuscripcionTallerController extends Controller
{
    public function show(): Response
    {
        $tenant = app(TenantManager::class)->current()?->tenant;
        abort_if($tenant === null, 404);

        return Inertia::render('configuracion/suscripcion/index', [
            'subscription' => TenantSubscriptionSummary::forTenant($tenant),
        ]);
    }
}
