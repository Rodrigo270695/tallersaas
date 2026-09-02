<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Checklist de configuración inicial (talleres)
    |--------------------------------------------------------------------------
    |
    | ONBOARDING_ENABLED=true muestra el panel en el dashboard de los
    | talleres que aún no completaron los pasos. No bloquea módulos.
    |
    | ONBOARDING_ENABLED_SLUGS limita el rollout a slugs concretos
    | (ej. taller-demo). Si hay valores, solo esos ven el checklist.
    |
    | ONBOARDING_PREVIEW=true o ?onboarding_preview=1 muestra el panel
    | aunque ya esté completado (no escribe onboarding_completado).
    |
    */
    'enabled' => filter_var(env('ONBOARDING_ENABLED', true), FILTER_VALIDATE_BOOL),

    'enabled_slugs' => array_values(array_filter(array_map(
        static fn (string $slug): string => strtolower(trim($slug)),
        explode(',', (string) env('ONBOARDING_ENABLED_SLUGS', ''))
    ))),

    'preview' => filter_var(env('ONBOARDING_PREVIEW', false), FILTER_VALIDATE_BOOL),

];
