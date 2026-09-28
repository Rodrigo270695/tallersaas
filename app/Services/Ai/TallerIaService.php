<?php

namespace App\Services\Ai;

use App\Models\Producto;
use App\Models\Servicio;
use App\Models\Vehiculo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;

class TallerIaService
{
    public function __construct(private OpenAiClient $client) {}

    /**
     * @return array{diagnostico: string, transcripcion: string, lineas: list<array<string, mixed>>}
     */
    public function presupuesto(string $texto, ?UploadedFile $audio, ?string $vehiculoId, ?string $sedeId): array
    {
        $transcripcion = $audio !== null ? $this->client->transcribe($audio) : '';
        $pedido = trim($texto."\n".$transcripcion);

        if ($pedido === '') {
            throw new OpenAiException('Escribe o dicta lo que hay que cotizar.', 422);
        }

        $servicios = $this->servicios($pedido);
        $productos = $this->productos($pedido, $sedeId);

        $decoded = $this->client->json(
            'Eres el asesor de un taller mecánico en Perú. Conviertes el pedido del asesor en líneas de presupuesto. '
            .'Usa solo ids del catálogo. Si no hay coincidencia clara, tipo "otro" y catalogo_id vacío. '
            .'No inventes precios. Cantidades razonables (un juego, un litro, una unidad). '
            .'El diagnóstico es una frase corta, en español, para el cliente.',
            $this->bloque($pedido, $vehiculoId, $servicios, $productos),
            self::schemaLineas(),
            'presupuesto_taller',
        );

        return [
            'diagnostico' => mb_substr(trim((string) ($decoded['diagnostico'] ?? '')), 0, 2000),
            'transcripcion' => $transcripcion,
            'lineas' => CatalogoLineas::materializar(
                is_array($decoded['lineas'] ?? null) ? $decoded['lineas'] : [],
                $servicios,
                $productos,
            ),
        ];
    }

    /**
     * @param  list<string>  $imagenes  data URLs
     * @return array{solicitud_cliente: string, diagnostico: string, danos: list<string>}
     */
    public function recepcion(array $imagenes, string $solicitud, ?string $vehiculoId): array
    {
        if ($imagenes === [] && trim($solicitud) === '') {
            throw new OpenAiException('Sube al menos una foto del auto o escribe la solicitud.', 422);
        }

        $decoded = $this->client->json(
            'Eres el asesor de recepción de un taller mecánico en Perú. Miras las fotos del auto al ingresar. '
            .'Redactas la solicitud del cliente y un diagnóstico breve con la lista de daños visibles. '
            .'No inventes golpes que no se vean. Español claro, sin tecnicismos de más.',
            $this->conImagenes(
                "Vehículo: {$this->vehiculoTexto($vehiculoId)}\nSolicitud ya anotada: ".trim($solicitud),
                $imagenes,
            ),
            [
                'type' => 'object',
                'additionalProperties' => false,
                'properties' => [
                    'solicitud_cliente' => ['type' => 'string'],
                    'diagnostico' => ['type' => 'string'],
                    'danos' => [
                        'type' => 'array',
                        'items' => ['type' => 'string'],
                    ],
                ],
                'required' => ['solicitud_cliente', 'diagnostico', 'danos'],
            ],
            'recepcion_taller',
        );

        $danos = [];
        foreach (array_slice(is_array($decoded['danos'] ?? null) ? $decoded['danos'] : [], 0, 12) as $dano) {
            $texto = trim((string) $dano);
            if ($texto !== '') {
                $danos[] = $texto;
            }
        }

        $diagnostico = trim((string) ($decoded['diagnostico'] ?? ''));
        if ($danos !== []) {
            $diagnostico = trim($diagnostico."\n\nDaños:\n- ".implode("\n- ", $danos));
        }

        return [
            'solicitud_cliente' => mb_substr(trim((string) ($decoded['solicitud_cliente'] ?? $solicitud)), 0, 2000),
            'diagnostico' => mb_substr($diagnostico, 0, 4000),
            'danos' => $danos,
        ];
    }

    /**
     * @return array{lineas: list<array<string, mixed>>}
     */
    public function repuestos(string $sintoma, ?string $vehiculoId, ?string $sedeId): array
    {
        $sintoma = trim($sintoma);
        if ($sintoma === '') {
            throw new OpenAiException('Escribe el síntoma o el trabajo para sugerir repuestos.', 422);
        }

        $productos = $this->productos($sintoma, $sedeId);

        $decoded = $this->client->json(
            'Eres el almacén de un taller mecánico en Perú. Según el vehículo y el síntoma, eliges repuestos del catálogo. '
            .'Solo ids de producto que existan. Si no está en el catálogo, catalogo_id vacío y describe la pieza a comprar. '
            .'No incluyas mano de obra.',
            $this->bloque($sintoma, $vehiculoId, [], $productos),
            self::schemaLineas(),
            'repuestos_taller',
        );

        return [
            'lineas' => CatalogoLineas::materializar(
                is_array($decoded['lineas'] ?? null) ? $decoded['lineas'] : [],
                [],
                $productos,
                soloProductos: true,
            ),
        ];
    }

    /**
     * @param  list<string>  $imagenes
     * @param  array{orden: string, placa: string, aseguradora: string, numero: string, cobertura: string, monto: string, notas: string}  $caso
     * @return array{informe: string}
     */
    public function siniestro(array $imagenes, array $caso): array
    {
        if ($imagenes === [] && trim($caso['notas']) === '') {
            throw new OpenAiException('Sube fotos del choque o escribe lo que pasó.', 422);
        }

        $decoded = $this->client->json(
            'Redactas el informe de un siniestro vehicular para una aseguradora en Perú. '
            .'Hechos visibles en las fotos y los datos del caso. No inventes culpables, velocidades ni lesiones. '
            .'Texto formal, en párrafos cortos, listo para pegar en el expediente.',
            $this->conImagenes($this->casoTexto($caso), $imagenes),
            [
                'type' => 'object',
                'additionalProperties' => false,
                'properties' => [
                    'informe' => ['type' => 'string'],
                ],
                'required' => ['informe'],
            ],
            'siniestro_taller',
        );

        $informe = trim((string) ($decoded['informe'] ?? ''));
        if ($informe === '') {
            throw new OpenAiException('La IA no redactó el informe.');
        }

        return ['informe' => mb_substr($informe, 0, 5000)];
    }

    /**
     * @param  list<string>  $imagenes
     * @return array{km: int}
     */
    public function odometro(array $imagenes): array
    {
        if ($imagenes === []) {
            throw new OpenAiException('Sube una foto del tablero.', 422);
        }

        $decoded = $this->client->json(
            'Lees el kilometraje del tablero de un auto en una foto. Devuelve solo el número entero de kilómetros que se ve. Si no se lee, km = -1.',
            $this->conImagenes('Foto del tablero. Extrae el odómetro en kilómetros.', $imagenes),
            [
                'type' => 'object',
                'additionalProperties' => false,
                'properties' => [
                    'km' => ['type' => 'integer'],
                ],
                'required' => ['km'],
            ],
            'odometro_taller',
        );

        $km = (int) ($decoded['km'] ?? -1);
        if ($km < 0 || $km > 9999999) {
            throw new OpenAiException('No se pudo leer el kilometraje. Prueba con otra foto, más de cerca.', 422);
        }

        return ['km' => $km];
    }

    /**
     * @return array{nota_interna: string, mensaje_cliente: string}
     */
    public function notaMecanico(string $texto, ?UploadedFile $audio, string $auto): array
    {
        $transcripcion = $audio !== null ? $this->client->transcribe($audio) : '';
        $pedido = trim($texto."\n".$transcripcion);
        if ($pedido === '') {
            throw new OpenAiException('Graba o escribe lo que dijo el mecánico.', 422);
        }

        $decoded = $this->client->json(
            'Eres el taller. El mecánico dictó el avance. Devuelve una nota interna breve para la orden y un mensaje de WhatsApp que el cliente entienda, sin jerga. No inventes repuestos ni precios.',
            "Auto: {$auto}\nDictado: {$pedido}",
            [
                'type' => 'object',
                'additionalProperties' => false,
                'properties' => [
                    'nota_interna' => ['type' => 'string'],
                    'mensaje_cliente' => ['type' => 'string'],
                ],
                'required' => ['nota_interna', 'mensaje_cliente'],
            ],
            'nota_mecanico',
        );

        return [
            'nota_interna' => mb_substr(trim((string) ($decoded['nota_interna'] ?? '')), 0, 2000),
            'mensaje_cliente' => mb_substr(trim((string) ($decoded['mensaje_cliente'] ?? '')), 0, 800),
        ];
    }

    public function seguimientoPresupuesto(string $cliente, string $auto, array $items): string
    {
        if ($items === []) {
            throw new OpenAiException('El presupuesto no tiene líneas.', 422);
        }

        $decoded = $this->client->json(
            'Escribes un WhatsApp corto de un taller en Perú. El cliente no respondió el presupuesto. Separas en una frase lo urgente y lo que puede esperar. Sin precios inventados. Máximo 500 caracteres. Tutea.',
            "Cliente: {$cliente}\nAuto: {$auto}\nLíneas:\n- ".implode("\n- ", $items),
            $this->schemaMensaje(),
            'seguimiento_presupuesto',
        );

        return $this->mensaje($decoded);
    }

    /**
     * @param  list<array{nombre: string, demanda: string, stock: string, falta: string}>  $filas
     */
    public function resumenCompras(array $filas): string
    {
        if ($filas === []) {
            return 'Esta semana no falta stock para lo que suelen pedir los autos con cita.';
        }

        $lineas = array_map(
            fn (array $fila): string => "{$fila['nombre']}: piden {$fila['demanda']}, hay {$fila['stock']}, faltan {$fila['falta']}",
            $filas,
        );

        $decoded = $this->client->json(
            'Resumes en un párrafo, para el dueño del taller, qué repuestos comprar antes de las citas de la semana. Solo usa los números que te pasan.',
            implode("\n", $lineas),
            $this->schemaMensaje(),
            'compras_semana',
        );

        return $this->mensaje($decoded);
    }

    public function campanaPlumillas(string $taller, int $total): string
    {
        $decoded = $this->client->json(
            'Escribes un solo WhatsApp de un taller en Perú para avisar que toca revisar plumillas antes de la lluvia. Incluye el placeholder {nombre}. Tutea. Máximo 400 caracteres. No inventes descuentos.',
            "Taller: {$taller}. Autos a avisar: {$total}.",
            $this->schemaMensaje(),
            'campana_plumillas',
        );

        $mensaje = $this->mensaje($decoded);
        if (! str_contains($mensaje, '{nombre}')) {
            $mensaje = 'Hola {nombre}. '.$mensaje;
        }

        return $mensaje;
    }

    /**
     * @param  array<string, mixed>  $decoded
     */
    private function mensaje(array $decoded): string
    {
        $mensaje = trim((string) ($decoded['mensaje'] ?? ''));
        if ($mensaje === '') {
            throw new OpenAiException('La IA no redactó el mensaje.');
        }

        return mb_substr($mensaje, 0, 800);
    }

    /**
     * @return array<string, mixed>
     */
    private function schemaMensaje(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'mensaje' => ['type' => 'string'],
            ],
            'required' => ['mensaje'],
        ];
    }

    /**
     * @return array<string, array{nombre: string, precio: string}>
     */
    private function servicios(string $texto): array
    {
        $query = Servicio::query()->where('activo', true);
        $this->priorizarPorTexto($query, $texto);
        $query->orderBy('nombre');

        $out = [];
        foreach ($query->limit(80)->get(['id', 'nombre', 'precio']) as $servicio) {
            $out[(string) $servicio->id] = [
                'nombre' => (string) $servicio->nombre,
                'precio' => number_format((float) $servicio->precio, 2, '.', ''),
            ];
        }

        return $out;
    }

    /**
     * @return array<string, array{nombre: string, precio: string, stock: string}>
     */
    private function productos(string $texto, ?string $sedeId): array
    {
        $query = Producto::query()
            ->where('activo', true)
            ->withSum(['existenciasSede as stock' => function ($stock) use ($sedeId): void {
                if (filled($sedeId)) {
                    $stock->where('sede_id', $sedeId);
                }
            }], 'cantidad');

        $this->priorizarPorTexto($query, $texto);
        $query->orderBy('nombre');

        $out = [];
        foreach ($query->limit(100)->get(['id', 'nombre', 'precio_venta']) as $producto) {
            $stock = number_format((float) ($producto->stock ?? 0), 3, '.', '');
            $out[(string) $producto->id] = [
                'nombre' => (string) $producto->nombre,
                'precio' => number_format((float) $producto->precio_venta, 2, '.', ''),
                'stock' => rtrim(rtrim($stock, '0'), '.') ?: '0',
            ];
        }

        return $out;
    }

    private function priorizarPorTexto(Builder $query, string $texto): void
    {
        $tokens = collect(preg_split('/\s+/u', mb_strtolower($texto)) ?: [])
            ->map(fn (string $token): string => trim($token, '.,;:'))
            ->filter(fn (string $token): bool => mb_strlen($token) >= 4)
            ->unique()
            ->take(6)
            ->values();

        if ($tokens->isEmpty()) {
            return;
        }

        $query->orderByRaw(
            'CASE WHEN '.collect($tokens)->map(fn (): string => 'nombre ILIKE ?')->implode(' OR ').' THEN 0 ELSE 1 END',
            $tokens->map(fn (string $token): string => '%'.$token.'%')->all(),
        );
    }

    /**
     * @param  array<string, array{nombre: string, precio: string}>  $servicios
     * @param  array<string, array{nombre: string, precio: string, stock: string}>  $productos
     */
    private function bloque(string $pedido, ?string $vehiculoId, array $servicios, array $productos): string
    {
        $lineas = ["Vehículo: {$this->vehiculoTexto($vehiculoId)}", "Pedido: {$pedido}", ''];

        if ($servicios !== []) {
            $lineas[] = 'Servicios (id | nombre | precio):';
            foreach ($servicios as $id => $servicio) {
                $lineas[] = "{$id} | {$servicio['nombre']} | {$servicio['precio']}";
            }
            $lineas[] = '';
        }

        $lineas[] = 'Repuestos (id | nombre | precio | stock):';
        foreach ($productos as $id => $producto) {
            $lineas[] = "{$id} | {$producto['nombre']} | {$producto['precio']} | {$producto['stock']}";
        }

        return implode("\n", $lineas);
    }

    /**
     * @param  list<string>  $imagenes
     * @return list<array<string, mixed>>
     */
    private function conImagenes(string $texto, array $imagenes): array
    {
        $content = [['type' => 'text', 'text' => $texto]];

        foreach (array_slice($imagenes, 0, 4) as $url) {
            $content[] = [
                'type' => 'image_url',
                'image_url' => ['url' => $url, 'detail' => 'auto'],
            ];
        }

        return $content;
    }

    private function vehiculoTexto(?string $vehiculoId): string
    {
        if (! filled($vehiculoId)) {
            return 'no indicado';
        }

        $vehiculo = Vehiculo::query()->with(['marca:id,nombre', 'modelo:id,nombre'])->find($vehiculoId);
        if ($vehiculo === null) {
            return 'no indicado';
        }

        return trim(implode(' ', array_filter([
            $vehiculo->marca?->nombre,
            $vehiculo->modelo?->nombre,
            $vehiculo->anio ? (string) $vehiculo->anio : null,
            $vehiculo->placa ? 'placa '.$vehiculo->placa : null,
        ])));
    }

    /**
     * @param  array{orden: string, placa: string, aseguradora: string, numero: string, cobertura: string, monto: string, notas: string}  $caso
     */
    private function casoTexto(array $caso): string
    {
        return implode("\n", [
            'Orden: '.$caso['orden'],
            'Placa: '.$caso['placa'],
            'Aseguradora: '.$caso['aseguradora'],
            'Número de siniestro: '.$caso['numero'],
            'Cobertura %: '.$caso['cobertura'],
            'Monto reclamado: '.$caso['monto'],
            'Notas del taller: '.$caso['notas'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private static function schemaLineas(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'diagnostico' => ['type' => 'string'],
                'lineas' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'properties' => [
                            'tipo' => ['type' => 'string', 'enum' => ['servicio', 'producto', 'otro']],
                            'catalogo_id' => ['type' => 'string'],
                            'descripcion' => ['type' => 'string'],
                            'cantidad' => ['type' => 'number'],
                        ],
                        'required' => ['tipo', 'catalogo_id', 'descripcion', 'cantidad'],
                    ],
                ],
            ],
            'required' => ['diagnostico', 'lineas'],
        ];
    }
}
