<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación para crear una marca de vehículo "al vuelo" desde el
 * combobox creable del formulario de vehículos.
 */
class MarcaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => [
                'required',
                'string',
                'max:80',
                Rule::unique('marcas', 'nombre')->where(fn ($query) => $query->whereNull('deleted_at')),
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('nombre')) {
            $this->merge(['nombre' => mb_strtoupper(trim((string) $this->input('nombre')))]);
        }
    }

    public function messages(): array
    {
        return [
            'nombre.unique' => 'Ya existe una marca con ese nombre.',
        ];
    }
}
