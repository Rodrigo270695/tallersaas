<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | API Perú (consulta DNI/RUC vía apiperu.dev)
    |--------------------------------------------------------------------------
    |
    | Fuente PRIMARIA para autocompletar clientes. Credenciales solo en
    | servidor: el panel del tenant llama a un endpoint Laravel que a su
    | vez consulta la API (nunca expongas el token al navegador).
    |
    */
    'apiperu' => [
        'base_url' => env('APIPERU_BASE_URL', 'https://apiperu.dev/api'),
        'token' => env('APIPERU_TOKEN'),
    ],

    /*
    |--------------------------------------------------------------------------
    | APISUNAT (APIs de apoyo — respaldo de apiperu.dev)
    |--------------------------------------------------------------------------
    |
    | Se usa SOLO si apiperu.dev falla (cuota agotada, timeout, 5xx). Si no
    | se define APISUNAT_LOOKUP_TOKEN, se intenta el token APISUNAT del
    | taller actual (el mismo usado para facturación electrónica).
    |
    */
    'apisunat_lookup' => [
        'base_url' => env('APISUNAT_LOOKUP_BASE_URL', 'https://dev.apisunat.pe/api/v1'),
        'token' => env('APISUNAT_LOOKUP_TOKEN'),
    ],

];
