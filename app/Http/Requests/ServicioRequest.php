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
        ];
    }

    public function attributes(): array
    {
        return [
            'categoria_id' => 'categoría',
            'nombre' => 'nombre',
            'precio' => 'precio',
            'duracion_minutos' => 'duración',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'activo' => $this->boolean('activo'),
            'categoria_id' => filled($this->input('categoria_id')) ? $this->input('categoria_id') : null,
            'descripcion' => filled($this->input('descripcion')) ? trim((string) $this->input('descripcion')) : null,
        ]);

        foreach (['precio', 'duracion_minutos'] as $campo) {
            if ($this->input($campo) === '') {
                $this->merge([$campo => null]);
            }
        }
    }
}
