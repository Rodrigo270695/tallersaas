<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RechazarPresupuestoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'motivo' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function attributes(): array
    {
        return [
            'motivo' => 'motivo',
        ];
    }
}
