<?php

return [

    'superadmin' => [
        'name' => env('PLATFORM_SUPERADMIN_NAME', 'Super administrador'),
        'email' => env('PLATFORM_SUPERADMIN_EMAIL'),
        'password' => env('PLATFORM_SUPERADMIN_PASSWORD'),
    ],

    /*
    | Tenant de demostración (slug fijo `demo`). Credenciales y sede están
    | hardcodeadas en ResetDemoCommand / DemoDataSeeder — no usan .env.
    | Crear una vez: php artisan db:seed --class=DemoTenantSeeder --force
    | Reset diario (cron → schedule:run): tallersaas:reset-demo @ 02:00
    */
    'demo_tenant' => [
        'slug' => 'demo',
        'plan' => 'pro',
        'razon_social' => 'Taller Demo S.A.C.',
        'nombre_comercial' => 'Taller Demo',
        'admin_email' => 'demo@tallersaas.pe',
        'admin_password' => 'demo1234',
    ],

];
