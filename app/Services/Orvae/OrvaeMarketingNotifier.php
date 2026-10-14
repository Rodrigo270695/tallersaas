<?php

declare(strict_types=1);

namespace App\Services\Orvae;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Avisa a Orvae que cambiaron los planes/features para que refresque su landing al instante.
 * Si falla no pasa nada: Orvae igual vuelve a consultar al vencer su caché.
 */
final class OrvaeMarketingNotifier
{
    public function plansChanged(): void
    {
        $url = trim((string) config('orvae.marketing.refresh_url', ''));
        $secret = (string) config('orvae.provision.hmac_secret', '');

        if ($url === '' || $secret === '') {
            return;
        }

        dispatch(function () use ($url, $secret): void {
            $body = (string) json_encode(['producto' => 'tallersaas', 'evento' => 'plans.updated']);
            $timestamp = (string) time();

            try {
                $response = Http::timeout(5)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'X-Orvae-Timestamp' => $timestamp,
                        'X-Orvae-Signature' => 'sha256='.hash_hmac('sha256', $timestamp.'.'.$body, $secret),
                        'X-Idempotency-Key' => (string) Str::uuid(),
                    ])
                    ->withBody($body, 'application/json')
                    ->post($url);

                if (! $response->successful()) {
                    Log::warning('orvae.marketing_refresh_failed', ['status' => $response->status()]);
                }
            } catch (Throwable $e) {
                Log::warning('orvae.marketing_refresh_exception', ['message' => $e->getMessage()]);
            }
        })->afterResponse();
    }
}
