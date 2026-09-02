<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CloseCajaSesionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('caja-sesiones.close') ?? false;
    }

    public function rules(): array
    {
        return [
            'saldo_cierre_efectivo' => ['required', 'numeric', 'min:0', 'max:9999999.99'],
            'notas' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function attributes(): array
    {
        return [
            'saldo_cierre_efectivo' => 'efectivo contado',
            'notas' => 'notas',
        ];
    }
}
