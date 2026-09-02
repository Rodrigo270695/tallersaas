<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación para crear un modelo de vehículo "al vuelo" desde el
 * combobox creable del formulario de vehículos (en cascada bajo una marca).
 */
class ModeloRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'marca_id' => ['required', 'uuid', 'exists:marcas,id'],
            'nombre' => [
                'required',
                'string',
                'max:80',
                Rule::unique('modelos', 'nombre')
                    ->where('marca_id', $this->input('marca_id'))
                    ->where(fn ($query) => $query->whereNull('deleted_at')),
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('nombre')) {
            $this->merge(['nombre' => mb_strtoupper(trim((string) $this->input('nombre')))]);
        }
    }

    public function attributes(): array
    {
        return [
            'marca_id' => 'marca',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.unique' => 'Ya existe un modelo con ese nombre para esta marca.',
        ];
    }
}
