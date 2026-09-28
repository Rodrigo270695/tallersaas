<?php

namespace App\Http\Controllers;

use App\Services\Ai\OpenAiException;
use App\Services\Ai\TallerIaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TallerIaController extends Controller
{
    public function presupuesto(Request $request, TallerIaService $ia): JsonResponse
    {
        abort_if(tenant_id() === null || tenant_id() === '', 403);
        $this->blankIds($request);

        $data = $request->validate([
            'texto' => ['nullable', 'string', 'max:4000'],
            'audio' => ['nullable', 'file', 'max:10240'],
            'vehiculo_id' => ['nullable', 'uuid'],
            'sede_id' => ['nullable', 'uuid'],
        ]);

        $audio = $request->file('audio');
        if ($audio !== null && ! $this->audioPermitido($audio->getMimeType())) {
            return response()->json(['message' => 'El audio tiene que ser una grabación de voz.'], 422);
        }

        return $this->responder(fn (): array => $ia->presupuesto(
            (string) ($data['texto'] ?? ''),
            $request->file('audio'),
            $data['vehiculo_id'] ?? null,
            $data['sede_id'] ?? null,
        ));
    }

    public function recepcion(Request $request, TallerIaService $ia): JsonResponse
    {
        abort_if(tenant_id() === null || tenant_id() === '', 403);
        $this->blankIds($request);

        $data = $request->validate([
            'solicitud' => ['nullable', 'string', 'max:4000'],
            'vehiculo_id' => ['nullable', 'uuid'],
            'fotos' => ['nullable', 'array', 'max:4'],
            'fotos.*' => ['image', 'mimes:jpeg,jpg,png,webp', 'max:4096'],
        ]);

        return $this->responder(fn (): array => $ia->recepcion(
            $this->dataUrls($request),
            (string) ($data['solicitud'] ?? ''),
            $data['vehiculo_id'] ?? null,
        ));
    }

    public function repuestos(Request $request, TallerIaService $ia): JsonResponse
    {
        abort_if(tenant_id() === null || tenant_id() === '', 403);
        $this->blankIds($request);

        $data = $request->validate([
            'sintoma' => ['required', 'string', 'max:4000'],
            'vehiculo_id' => ['nullable', 'uuid'],
            'sede_id' => ['nullable', 'uuid'],
        ]);

        return $this->responder(fn (): array => $ia->repuestos(
            $data['sintoma'],
            $data['vehiculo_id'] ?? null,
            $data['sede_id'] ?? null,
        ));
    }

    public function odometro(Request $request, TallerIaService $ia): JsonResponse
    {
        abort_if(tenant_id() === null || tenant_id() === '', 403);

        $request->validate([
            'foto' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:4096'],
        ]);

        $foto = $request->file('foto');
        $bytes = $foto !== null ? file_get_contents($foto->getRealPath()) : false;
        if ($bytes === false || $foto === null) {
            return response()->json(['message' => 'No se pudo leer la foto.'], 422);
        }

        $url = 'data:'.($foto->getMimeType() ?: 'image/jpeg').';base64,'.base64_encode($bytes);

        return $this->responder(fn (): array => $ia->odometro([$url]));
    }

    public function notaMecanico(Request $request, TallerIaService $ia): JsonResponse
    {
        abort_if(tenant_id() === null || tenant_id() === '', 403);

        $data = $request->validate([
            'texto' => ['nullable', 'string', 'max:4000'],
            'audio' => ['nullable', 'file', 'max:10240'],
            'auto' => ['nullable', 'string', 'max:120'],
        ]);

        $audio = $request->file('audio');
        if ($audio !== null && ! $this->audioPermitido($audio->getMimeType())) {
            return response()->json(['message' => 'El audio tiene que ser una grabación de voz.'], 422);
        }

        return $this->responder(fn (): array => $ia->notaMecanico(
            (string) ($data['texto'] ?? ''),
            $audio,
            (string) ($data['auto'] ?? 'el auto'),
        ));
    }

    public function siniestro(Request $request, TallerIaService $ia): JsonResponse
    {
        abort_if(tenant_id() === null || tenant_id() === '', 403);

        $data = $request->validate([
            'orden' => ['nullable', 'string', 'max:80'],
            'placa' => ['nullable', 'string', 'max:20'],
            'aseguradora' => ['nullable', 'string', 'max:160'],
            'numero' => ['nullable', 'string', 'max:80'],
            'cobertura' => ['nullable', 'string', 'max:20'],
            'monto' => ['nullable', 'string', 'max:20'],
            'notas' => ['nullable', 'string', 'max:4000'],
            'fotos' => ['nullable', 'array', 'max:4'],
            'fotos.*' => ['image', 'mimes:jpeg,jpg,png,webp', 'max:4096'],
        ]);

        return $this->responder(fn (): array => $ia->siniestro($this->dataUrls($request), [
            'orden' => (string) ($data['orden'] ?? ''),
            'placa' => (string) ($data['placa'] ?? ''),
            'aseguradora' => (string) ($data['aseguradora'] ?? ''),
            'numero' => (string) ($data['numero'] ?? ''),
            'cobertura' => (string) ($data['cobertura'] ?? ''),
            'monto' => (string) ($data['monto'] ?? ''),
            'notas' => (string) ($data['notas'] ?? ''),
        ]));
    }

    /**
     * @param  callable(): array<string, mixed>  $action
     */
    private function blankIds(Request $request): void
    {
        $request->merge([
            'vehiculo_id' => $request->filled('vehiculo_id') ? $request->input('vehiculo_id') : null,
            'sede_id' => $request->filled('sede_id') ? $request->input('sede_id') : null,
        ]);
    }

    private function audioPermitido(?string $mime): bool
    {
        if ($mime === null || $mime === '') {
            return false;
        }

        return str_starts_with($mime, 'audio/') || in_array($mime, ['video/webm', 'video/mp4'], true);
    }

    private function responder(callable $action): JsonResponse
    {
        try {
            return response()->json($action());
        } catch (OpenAiException $exception) {
            return response()->json(['message' => $exception->getMessage()], $exception->httpStatus);
        }
    }

    /**
     * @return list<string>
     */
    private function dataUrls(Request $request): array
    {
        $urls = [];

        foreach ($request->file('fotos', []) as $foto) {
            $mime = $foto->getMimeType() ?: 'image/jpeg';
            $bytes = file_get_contents($foto->getRealPath());
            if ($bytes === false) {
                continue;
            }

            $urls[] = 'data:'.$mime.';base64,'.base64_encode($bytes);
        }

        return $urls;
    }
}
