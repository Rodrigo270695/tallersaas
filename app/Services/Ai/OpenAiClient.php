<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\RequestException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

class OpenAiClient
{
    public function configured(): bool
    {
        return filled(config('services.openai.key'));
    }

    /**
     * @param  string|list<array<string, mixed>>  $userContent
     * @param  array<string, mixed>  $schema
     * @return array<string, mixed>
     */
    public function json(string $system, string|array $userContent, array $schema, string $name): array
    {
        $this->guard();

        try {
            $response = Http::withToken((string) config('services.openai.key'))
                ->acceptJson()
                ->timeout((int) config('services.openai.timeout', 45))
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => (string) config('services.openai.model', 'gpt-4.1-mini'),
                    'temperature' => 0.2,
                    'max_completion_tokens' => 1800,
                    'messages' => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user', 'content' => $userContent],
                    ],
                    'response_format' => [
                        'type' => 'json_schema',
                        'json_schema' => [
                            'name' => $name,
                            'strict' => true,
                            'schema' => $schema,
                        ],
                    ],
                ])
                ->throw();
        } catch (RequestException $exception) {
            throw new OpenAiException($this->upstreamMessage($exception));
        }

        $content = $response->json('choices.0.message.content');
        $decoded = is_string($content) ? json_decode($content, true) : null;

        if (! is_array($decoded)) {
            throw new OpenAiException('La IA no devolvió un resultado usable.');
        }

        return $decoded;
    }

    public function transcribe(UploadedFile $file): string
    {
        $this->guard();

        try {
            $response = Http::withToken((string) config('services.openai.key'))
                ->timeout((int) config('services.openai.timeout', 45))
                ->attach('file', fopen($file->getRealPath(), 'r'), $file->getClientOriginalName() ?: 'audio.webm')
                ->post('https://api.openai.com/v1/audio/transcriptions', [
                    'model' => (string) config('services.openai.transcribe_model', 'gpt-4o-mini-transcribe'),
                    'language' => 'es',
                ])
                ->throw();
        } catch (RequestException $exception) {
            throw new OpenAiException($this->upstreamMessage($exception));
        }

        return trim((string) $response->json('text'));
    }

    private function guard(): void
    {
        if (! $this->configured()) {
            throw new OpenAiException('Falta OPENAI_API_KEY en el servidor.', 503);
        }
    }

    private function upstreamMessage(RequestException $exception): string
    {
        $body = $exception->response?->json('error.message');

        if (is_string($body) && $body !== '') {
            return 'OpenAI: '.$body;
        }

        return 'No se pudo consultar OpenAI.';
    }
}
