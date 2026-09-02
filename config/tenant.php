<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Schema PostgreSQL al migrar el tenant (uso interno de Artisan)
    |--------------------------------------------------------------------------
    |
    | Solo se usa al ejecutar:
    |
    |   php artisan tallersaas:tenant-migrate <schema>
    |   php artisan tallersaas:tenant-migrate-all
    |
    | El comando setea esta clave en runtime y las migraciones de
    | `database/migrations/tenant/` la leen para aplicar
    | `SET search_path TO "<schema>", public` y crear las tablas
    | dentro del schema correcto. Mantener vacío fuera de ese comando.
    |
    */
    'migration_schema' => env('TENANT_MIGRATION_SCHEMA'),

    /*
    |--------------------------------------------------------------------------
    | Dominios "centrales" del SaaS (panel del superadmin)
    |--------------------------------------------------------------------------
    |
    | Hosts que NUNCA se interpretan como subdominios de tenant. Aquí vive
    | el panel `/plataforma/*` y rutas internas del SaaS.
    |
    */
    'central_domains' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('TENANT_CENTRAL_DOMAINS', 'localhost,127.0.0.1,tallersaas.test'))
    ))),

    /*
    |--------------------------------------------------------------------------
    | Dominio raíz para los subdominios de tenant
    |--------------------------------------------------------------------------
    |
    | Con `tallersaas.test` como root y un host `taller-rivera.tallersaas.test`,
    | el slug resuelto será `taller-rivera`.
    |
    */
    'root_domain' => env('TENANT_ROOT_DOMAIN', 'tallersaas.test'),

    /*
    |--------------------------------------------------------------------------
    | Prefijo aplicado al nombre del schema físico
    |--------------------------------------------------------------------------
    |
    | Solo se usa para *validar* el schema en runtime (no para construirlo:
    | el nombre real vive en `tenants.schema_name`).
    |
    */
    'schema_prefix' => env('TENANT_SCHEMA_PREFIX', 'taller_'),

    /*
    |--------------------------------------------------------------------------
    | Estados que SÍ pueden acceder al subdominio
    |--------------------------------------------------------------------------
    */
    'allowed_states' => ['active', 'trial', 'grace'],

    /*
    |--------------------------------------------------------------------------
    | TTL del cache de resolución (segundos)
    |--------------------------------------------------------------------------
    |
    | 0 = sin cache (golpea BD en cada request).
    |
    */
    'cache_ttl' => (int) env('TENANT_CACHE_TTL', 60),

];
