<?php

return [

    'superadmin' => [
        'name' => env('PLATFORM_SUPERADMIN_NAME', 'Super administrador'),
        'email' => env('PLATFORM_SUPERADMIN_EMAIL'),
        'password' => env('PLATFORM_SUPERADMIN_PASSWORD'),
    ],

    /*
    | Tenant de demostración (solo para probar la plataforma en un
    | subdominio real, ej. demo.tallersaas.orvae.pe). Se crea con
    | `php artisan db:seed --class=DemoTenantSeeder`. No se incluye en
    | DatabaseSeeder para evitar crearlo por accidente en cada deploy.
    */
    'demo_tenant' => [
        'slug' => env('DEMO_TENANT_SLUG', 'demo'),
        'plan' => env('DEMO_TENANT_PLAN', 'pro'),
        'razon_social' => env('DEMO_TENANT_RAZON_SOCIAL', 'Taller Demo S.A.C.'),
        'nombre_comercial' => env('DEMO_TENANT_NOMBRE_COMERCIAL', 'Taller Demo'),
        'admin_email' => env('DEMO_TENANT_ADMIN_EMAIL', 'admin@demo.orvae.pe'),
        // Clave pública de la demo (se restaura cada noche con tallersaas:reset-demo).
        'admin_password' => env('DEMO_TENANT_ADMIN_PASSWORD', 'demo1234'),
        'sede_codigo' => env('DEMO_TENANT_SEDE_CODIGO', 'CHI-01'),
        'sede_nombre' => env('DEMO_TENANT_SEDE_NOMBRE', 'Sede prueba'),
    ],
];
