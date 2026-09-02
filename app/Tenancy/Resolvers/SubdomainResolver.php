<?php

namespace App\Tenancy\Resolvers;

use Illuminate\Http\Request;

/**
 * Extrae el slug del tenant a partir del host del request HTTP.
 *
 * Reglas (validadas en este orden):
 *   1. Si el host figura en `tenant.central_domains` → null (es el panel).
 *   2. Si el host NO termina en `.<tenant.root_domain>` → null.
 *   3. Si lo que queda al quitar el sufijo contiene `.` → null (sub-sub).
 *   4. Si el slug resultante no respeta el formato de subdominio DNS → null.
 */
class SubdomainResolver
{
    public function resolveFromRequest(Request $request): ?string
    {
        return $this->resolveFromHost($request->getHost());
    }

    public function resolveFromHost(string $host): ?string
    {
        $host = strtolower(trim($host));

        if ($host === '') {
            return null;
        }

        $centrals = array_map('strtolower', (array) config('tenant.central_domains', []));
        if (in_array($host, $centrals, true)) {
            return null;
        }

        $root = strtolower((string) config('tenant.root_domain', ''));
        if ($root === '') {
            return null;
        }

        $suffix = '.'.$root;
        if (! str_ends_with($host, $suffix)) {
            return null;
        }

        $sub = substr($host, 0, -strlen($suffix));

        if ($sub === '' || str_contains($sub, '.')) {
            return null;
        }

        if (! preg_match('/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/', $sub)) {
            return null;
        }

        return $sub;
    }
}
