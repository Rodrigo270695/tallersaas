<?php

namespace App\Providers;

use App\Tenancy\Resolvers\SubdomainResolver;
use App\Tenancy\TenantManager;
use Illuminate\Support\ServiceProvider;

/**
 * Registra los componentes del sistema multi-tenant.
 *
 * Se carga vía bootstrap/providers.php junto a los demás providers de la
 * app. Se mantiene como provider regular (no deferrable) porque el
 * middleware `tenant` lo necesita en prácticamente todos los requests
 * del grupo `web`.
 */
class TenancyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(TenantManager::class);
        $this->app->singleton(SubdomainResolver::class);

        $this->app->alias(TenantManager::class, 'tenant.manager');
        $this->app->alias(SubdomainResolver::class, 'tenant.resolver.subdomain');
    }

    public function boot(): void
    {
        //
    }
}
