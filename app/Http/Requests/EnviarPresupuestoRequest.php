<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EnviarPresupuestoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'telefono' => ['required', 'string', 'max:20'],
            'mensaje' => ['nullable', 'string', 'max:2000'],
            'guardar_en_cliente' => ['sometimes', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'telefono' => 'WhatsApp',
            'mensaje' => 'mensaje',
        ];
    }
}
