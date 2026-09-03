<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ServicioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'categoria_id' => [
                'nullable',
                'uuid',
                Rule::exists('categorias_servicios', 'id')->whereNull('deleted_at'),
            ],
            'nombre' => ['required', 'string', 'max:255'],
            'descripcion' => ['nullable', 'string', 'max:2000'],
            'precio' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'duracion_minutos' => ['nullable', 'integer', 'min:1', 'max:1440'],
            'activo' => ['required', 'boolean'],
            'kit' => ['nullable', 'array', 'max:40'],
            'kit.*.producto_id' => [
                'required',
                'uuid',
                'distinct',
                Rule::exists('productos', 'id')->whereNull('deleted_at'),
            ],
            'kit.*.cantidad' => ['required', 'numeric', 'min:0.001', 'max:999999.999'],
        ];
    }

    public function attributes(): array
    {
        return [
            'categoria_id' => 'categoría',
            'nombre' => 'nombre',
            'precio' => 'precio',
            'duracion_minutos' => 'duración',
            'kit' => 'kit',
            'kit.*.producto_id' => 'repuesto del kit',
            'kit.*.cantidad' => 'cantidad del kit',
        ];
    }

    protected function prepareForValidation(): void
    {
        $merge = [
            'activo' => $this->boolean('activo'),
            'categoria_id' => filled($this->input('categoria_id')) ? $this->input('categoria_id') : null,
            'descripcion' => filled($this->input('descripcion')) ? trim((string) $this->input('descripcion')) : null,
        ];

        if ($this->exists('kit')) {
            $kit = $this->input('kit');
            $kitNormalizado = [];

            if (is_array($kit)) {
                foreach ($kit as $item) {
                    if (! is_array($item)) {
                        continue;
                    }

                    $productoId = isset($item['producto_id']) ? trim((string) $item['producto_id']) : '';
                    $cantidad = $item['cantidad'] ?? '';

                    if ($productoId === '' && ($cantidad === '' || $cantidad === null)) {
                        continue;
                    }

                    $kitNormalizado[] = [
                        'producto_id' => $productoId !== '' ? $productoId : null,
                        'cantidad' => $cantidad === '' ? null : $cantidad,
                    ];
                }
            }

            $merge['kit'] = $kitNormalizado;
        }

        $this->merge($merge);

        foreach (['precio', 'duracion_minutos'] as $campo) {
            if ($this->input($campo) === '') {
                $this->merge([$campo => null]);
            }
        }
    }
}