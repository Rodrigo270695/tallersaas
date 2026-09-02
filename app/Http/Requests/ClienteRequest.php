<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación unificada para crear y editar clientes del taller.
 */
class ClienteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $clienteId = $this->route('cliente')?->id;

        return [
            'nombres' => ['required', 'string', 'max:150'],
            'apellidos' => ['nullable', 'string', 'max:150'],
            'tipo_documento' => ['required', 'string', Rule::in(['DNI', 'RUC', 'CE', 'PAS'])],
            'numero_documento' => [
                'nullable',
                'string',
                'max:15',
                Rule::unique('clientes', 'numero_documento')
                    ->where(fn ($query) => $query
                        ->where('tipo_documento', $this->input('tipo_documento'))
                        ->whereNull('deleted_at'))
                    ->ignore($clienteId),
            ],
            'telefono' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150'],
            'direccion' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function attributes(): array
    {
        return [
            'nombres' => 'nombres',
            'apellidos' => 'apellidos',
            'tipo_documento' => 'tipo de documento',
            'numero_documento' => 'número de documento',
            'telefono' => 'teléfono',
            'email' => 'correo',
            'direccion' => 'dirección',
        ];
    }
}
