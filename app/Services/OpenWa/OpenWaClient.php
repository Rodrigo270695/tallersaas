<?php

declare(strict_types=1);

namespace App\Services\OpenWa;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Cliente HTTP para OpenWA (envío de texto y gestión de sesión).
 */
final class OpenWaClient
{
    public function isConfigured(): bool
    {
        return (bool) config('openwa.enabled')
            && trim((string) config('openwa.api_key', '')) !== '';
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listSessions(): array
    {
        $response = $this->request('get', '/api/sessions');

        return is_array($response) ? $response : [];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findSessionByName(string $name): ?array
    {
        foreach ($this->listSessions() as $session) {
            if (is_array($session) && ($session['name'] ?? null) === $name) {
                return $session;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    public function createSession(string $name): array
    {
        $response = $this->request('post', '/api/sessions', [
            'name' => $name,
            'config' => ['autoReconnect' => true],
        ]);

        if (! is_array($response)) {
            throw new RuntimeException('OpenWA no devolvió sesión al crear.');
        }

        return $response;
    }

    /**
     * @return array<string, mixed>
     */
    public function getSession(string $sessionId): array
    {
        $response = $this->request('get', '/api/sessions/'.$sessionId);

        if (! is_array($response)) {
            throw new RuntimeException('Sesión OpenWA no encontrada: '.$sessionId);
        }

        return $response;
    }

    /**
     * @return array<string, mixed>
     */
    public function sendText(string $sessionId, string $chatId, string $text): array
    {
        $response = $this->request('post', '/api/sessions/'.$sessionId.'/messages/send-text', [
            'chatId' => $chatId,
            'text' => $text,
        ]);

        if (! is_array($response)) {
            throw new RuntimeException('OpenWA no confirmó el envío del mensaje.');
        }

        return $response;
    }

    /**
     * @return array<string, mixed>
     */
    public function sendTextWithDeliveryFallback(string $sessionId, string $chatId, string $text): array
    {
        try {
            return $this->sendText($sessionId, $chatId, $text);
        } catch (\Throwable $error) {
            if ($this->isAmbiguousDeliveryError($error)) {
                Log::warning('OpenWA send-text: respuesta ambigua; se asume envío OK', [
                    'error' => $error->getMessage(),
                    'chat_id' => $chatId,
                ]);

                return ['messageId' => null, 'assumed_delivery' => true];
            }

            throw $error;
        }
    }

    public function isAmbiguousDeliveryError(\Throwable $error): bool
    {
        return $this->isAmbiguousDeliveryErrorMessage($error->getMessage());
    }

    public function isAmbiguousDeliveryErrorMessage(string $message): bool
    {
        if ($message === '') {
            return false;
        }

        if (str_contains($message, 'Error de red con OpenWA')
            || str_contains($message, 'timed out')
            || str_contains($message, 'cURL error 28')
            || str_contains($message, 'Internal server error')
            || str_contains($message, '"statusCode":500')) {
            return true;
        }

        return (bool) preg_match('/OpenWA HTTP 5\d{2}/', $message);
    }

    /**
     * @return array<string, mixed>
     */
    public function startSession(string $sessionId): array
    {
        $response = $this->request('post', '/api/sessions/'.$sessionId.'/start');

        if (! is_array($response)) {
            throw new RuntimeException('OpenWA no pudo iniciar la sesión.');
        }

        return $response;
    }

    /**
     * @return array<string, mixed>
     */
    public function getQrCode(string $sessionId): array
    {
        $response = $this->request('get', '/api/sessions/'.$sessionId.'/qr');

        if (! is_array($response)) {
            throw new RuntimeException('OpenWA no devolvió código QR.');
        }

        return $response;
    }

    /**
     * @return array{attempted: bool, remote: ?array<string, mixed>, error: ?string}
     */
    public function tryStartIfDown(string $sessionId, string $status): array
    {
        if (! in_array($status, ['disconnected', 'failed'], true)) {
            return ['attempted' => false, 'remote' => null, 'error' => null];
        }

        try {
            $this->startSession($sessionId);
            $remote = $this->waitForSessionProgress($sessionId, $status);

            Log::info('OpenWA reconnect attempted', [
                'session_id' => $sessionId,
                'from_status' => $status,
                'to_status' => $remote['status'] ?? null,
            ]);

            return ['attempted' => true, 'remote' => $remote, 'error' => null];
        } catch (\Throwable $e) {
            Log::warning('OpenWA reconnect failed', [
                'session_id' => $sessionId,
                'from_status' => $status,
                'error' => $e->getMessage(),
            ]);

            return ['attempted' => true, 'remote' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function waitForSessionProgress(string $sessionId, string $fromStatus): array
    {
        $remote = $this->getSession($sessionId);
        $status = (string) ($remote['status'] ?? $fromStatus);

        for ($i = 0; $i < 4; $i++) {
            if (in_array($status, ['ready', 'qr_ready', 'authenticating'], true)) {
                break;
            }
            if ($status === 'initializing' || in_array($status, ['disconnected', 'failed'], true)) {
                $wait = max(0, (int) config('openwa.reconnect_poll_seconds', 3));
                if ($wait > 0) {
                    sleep($wait);
                }
                $remote = $this->getSession($sessionId);
                $status = (string) ($remote['status'] ?? $status);
            } else {
                break;
            }
        }

        if (in_array($status, ['disconnected', 'failed'], true)) {
            try {
                $this->startSession($sessionId);
                $wait = max(0, (int) config('openwa.reconnect_poll_seconds', 3));
                if ($wait > 0) {
                    sleep($wait);
                }
                $remote = $this->getSession($sessionId);
            } catch (\Throwable) {
                // Dejamos el último remote conocido.
            }
        }

        return $remote;
    }

    /**
     * @return array<string, mixed>
     */
    public function stopSession(string $sessionId): array
    {
        $response = $this->request('post', '/api/sessions/'.$sessionId.'/stop');

        if (! is_array($response)) {
            throw new RuntimeException('OpenWA no confirmó la desconexión de WhatsApp.');
        }

        return $response;
    }

    /**
     * @param  array<string, mixed>|null  $body
     * @return array<string, mixed>|list<array<string, mixed>>|null
     */
    private function request(string $method, string $path, ?array $body = null): mixed
    {
        $apiKey = trim((string) config('openwa.api_key', ''));
        if ($apiKey === '') {
            throw new RuntimeException('OPENWA_API_KEY no configurada.');
        }

        $url = rtrim((string) config('openwa.api_url'), '/').$path;

        try {
            $pending = Http::timeout((int) config('openwa.timeout_seconds', 30))
                ->acceptJson()
                ->withHeaders(['X-API-Key' => $apiKey]);

            $response = match ($method) {
                'get' => $pending->get($url),
                'post' => $pending->post($url, $body ?? []),
                'put' => $pending->put($url, $body ?? []),
                'delete' => $pending->delete($url),
                default => throw new RuntimeException('Método HTTP no soportado: '.$method),
            };
        } catch (RequestException $e) {
            throw new RuntimeException('Error de red con OpenWA: '.$e->getMessage(), 0, $e);
        }

        if (! $response->successful()) {
            throw new RuntimeException(
                'OpenWA HTTP '.$response->status().': '.(string) $response->body(),
            );
        }

        $json = $response->json();

        return is_array($json) ? $json : [];
    }
}
