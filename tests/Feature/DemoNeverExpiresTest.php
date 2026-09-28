<?php

use App\Models\Tenant;
use App\Services\Subscriptions\TenantSubscriptionAccess;

it('la demo no se bloquea aunque la prueba ya haya vencido', function () {
    $tenant = new Tenant([
        'slug' => 'demo',
        'estado' => 'trial',
        'trial_ends_at' => now()->subYear(),
    ]);

    expect(app(TenantSubscriptionAccess::class)->resolveDenial($tenant))->toBeNull();
});
