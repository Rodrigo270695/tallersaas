<?php

namespace App\Http\Requests;

use App\Rules\ExistsDistritoId;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validación unificada para crear y editar sedes.
 *
 * `codigo` se genera automáticamente en el backend (`Sede::generateNextCode`).
 */
class SedeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:150'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'telefono' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150'],
            'distrito_id' => ['required', 'integer', new ExistsDistritoId],
            'activa' => ['required', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'nombre' => 'nombre',
            'direccion' => 'dirección',
            'telefono' => 'teléfono',
            'email' => 'correo',
            'distrito_id' => 'distrito (ubicación)',
            'activa' => 'estado',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'activa' => $this->boolean('activa'),
        ]);
    }
}
