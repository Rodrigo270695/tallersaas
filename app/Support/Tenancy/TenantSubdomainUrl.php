<?php

declare(strict_types=1);

namespace App\Support\Tenancy;

use App\Models\Tenant;

/**
 * URLs absolutas de subdominios de taller ({slug}.{root_domain}).
 */
final class TenantSubdomainUrl
{
    public static function rootDomain(): string
    {
        return trim((string) config('tenant.root_domain', 'tallersaas.test'));
    }

    public static function scheme(): string
    {
        return trim((string) config('orvae.tenant.scheme', 'https'));
    }

    public static function loginPath(): string
    {
        $path = (string) config('orvae.tenant.login_path', '/login');

        return str_starts_with($path, '/') ? $path : '/'.$path;
    }

    public static function host(Tenant|string $tenant): string
    {
        $slug = $tenant instanceof Tenant
            ? trim((string) $tenant->slug)
            : trim($tenant);

        return $slug.'.'.self::rootDomain();
    }

    public static function build(Tenant|string $tenant, string $path = '/'): string
    {
        $path = $path === '' ? '/' : (str_starts_with($path, '/') ? $path : '/'.$path);

        return sprintf('%s://%s%s', self::scheme(), self::host($tenant), $path);
    }

    public static function login(Tenant|string $tenant): string
    {
        return self::build($tenant, self::loginPath());
    }

    /**
     * URL one-shot de primer ingreso (Orvae → subdominio → cambiar contraseña).
     */
    public static function bootstrapLogin(Tenant $tenant, string $plainToken): string
    {
        return self::build($tenant, '/auth/bienvenida/'.$plainToken);
    }
}
