<?php

return [

    /*
    |--------------------------------------------------------------------------
    | OpenWA (WhatsApp gateway self-hosted)
    |--------------------------------------------------------------------------
    |
    | Cada taller tiene una sesión OpenWA nombrada con su slug.
    | TallerSaaS envía mensajes vía X-API-Key hacia esa sesión.
    |
    */
    'enabled' => (bool) env('OPENWA_ENABLED', false),

    'api_url' => rtrim((string) env('OPENWA_API_URL', 'https://wa.vetsaas.orvae.pe'), '/'),

    'api_key' => env('OPENWA_API_KEY'),

    'admin_url' => rtrim((string) env('OPENWA_ADMIN_URL', 'https://wa-admin.vetsaas.orvae.pe'), '/'),

    'timeout_seconds' => (int) env('OPENWA_TIMEOUT_SECONDS', 30),

    'max_attempts' => (int) env('OPENWA_QUEUE_MAX_ATTEMPTS', 3),

    'platform_session_name' => env('OPENWA_PLATFORM_SESSION_NAME', 'tallersaas-platform'),

    'reconnect_poll_seconds' => (int) env('OPENWA_RECONNECT_POLL_SECONDS', 3),

];
